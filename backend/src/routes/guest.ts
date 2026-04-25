import { Request, Response, Router } from 'express';
import { db } from '../utils/firebase';
import { classifyIncident, answerGuestQuestion } from '../services/aiClassifier';
import { calculateRouting } from '../services/routingService';
import { GuestReport, Incident } from '../../../shared/types';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getIO } from '../services/socketService';

const router = Router();

// ─── CONSTANTS ────────────────────────────────────────────────────
const QR_PROPERTY_SECRET = process.env.QR_PROPERTY_SECRET || 'crisisync-property-secret-2025';
const QR_SESSION_TTL_MS = 15 * 60 * 1000;   // 15 minutes
const JWT_SECRET = process.env.JWT_SECRET || 'crisis-responder-secret';

// ─── HOTEL GEOFENCE ───────────────────────────────────────────────
// Set these to your hotel's actual GPS coordinates in production
const HOTEL_CENTER = { lat: 12.9716, lng: 77.5946 }; // Example: Bangalore
const HOTEL_RADIUS_METERS = 200; // Must be within 200m of hotel center

// Haversine distance formula (meters)
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// In-memory store for active sessions (use Redis in production)
const activeSessions: Record<string, {
  zoneId: string;
  zoneName: string;
  issuedAt: number;
  used: boolean;
}> = {};

// Rate limiting cache — per session
const rateLimits: Record<string, number[]> = {};

// IP-based rate limiting — max 3 scans per IP per hour
const ipScanLimits: Record<string, number[]> = {};

// Blacklisted sessions (abusers)
const blacklistedSessions = new Set<string>();

// Abuse score per session (incremented on suspicious behaviour)
const abuseScores: Record<string, number> = {};

// Spam keywords that get flagged
const SPAM_PATTERNS = [
  /^(test|hello|hi|hey|lol|haha|asdf|qwerty|[a-z]{1,2})$/i,
  /(..)\1{4,}/,  // repeated chars like "aaaaaaa"
];

// Location-verified sessions
const locationVerified = new Set<string>();
const locationDenied = new Set<string>();

// ─── LAYER 6: GPS LOCATION VERIFICATION ENDPOINT ─────────────────────
// POST /guest/verify-location
// Called from guest page after browser GPS resolves.
// If inside hotel → full trust. If outside → flagged/blocked.
router.post('/verify-location', async (req: Request, res: Response) => {
  const { sessionToken, lat, lng } = req.body;
  if (!sessionToken) return res.status(400).json({ error: 'Missing sessionToken' });

  let sessionData: any;
  try {
    sessionData = jwt.verify(sessionToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Guest denied location access
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    locationDenied.add(sessionToken);
    return res.status(200).json({
      verified: false,
      reason: 'LOCATION_DENIED',
      message: 'Location not shared. Session continues with reduced trust level.'
    });
  }

  const distance = getDistanceMeters(parseFloat(lat), parseFloat(lng), HOTEL_CENTER.lat, HOTEL_CENTER.lng);
  const isInsideHotel = distance <= HOTEL_RADIUS_METERS;

  if (isInsideHotel) {
    locationVerified.add(sessionToken);
    return res.status(200).json({
      verified: true,
      distance: Math.round(distance),
      message: `✅ Location verified — you are ${Math.round(distance)}m from hotel center.`
    });
  } else {
    abuseScores[sessionToken] = (abuseScores[sessionToken] || 0) + 2;
    if (abuseScores[sessionToken] >= 3) {
      blacklistedSessions.add(sessionToken);
    }
    return res.status(200).json({
      verified: false,
      distance: Math.round(distance),
      reason: 'OUTSIDE_PROPERTY',
      message: `⚠️ You appear to be ${Math.round(distance)}m away. This QR is for in-property guests only.`
    });
  }
});

// ─── PERMANENT QR CODE ENDPOINT (printed on physical placard) ───────
// GET /guest/scan/:zoneId
// This URL is what's embedded in the physical QR code.
// It NEVER expires — each scan just generates a fresh 15-min session.
router.get('/scan/:zoneId', async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const zoneName = decodeURIComponent(req.query.zone as string || zoneId);
  const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  // ── LAYER 2: IP-based rate limiting (3 scans per hour per IP) ──
  const now = Date.now();
  const ipScans = ipScanLimits[clientIp] || [];
  const recentIpScans = ipScans.filter(t => now - t < 60 * 60 * 1000);
  if (recentIpScans.length >= 3) {
    return res.send(buildErrorPage(
      'Too Many Scans',
      'You have scanned too many QR codes in a short time. Please wait before scanning again, or contact a staff member directly.'
    ));
  }
  recentIpScans.push(now);
  ipScanLimits[clientIp] = recentIpScans;

  // Auto-generate a fresh session token on every scan
  const tokenPayload = {
    zoneId,
    zoneName,
    propertyId: 'grand-thalassa-hotel',
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const qrToken = jwt.sign(tokenPayload, QR_PROPERTY_SECRET, {
    expiresIn: '15m',
    issuer: 'crisisync',
  });

  // Redirect guest directly to the portal with a fresh token
  return res.redirect(`/guest/portal?token=${qrToken}`);
});

// ─── GET PERMANENT QR URL FOR A ZONE (for staff to print) ──────────
// GET /guest/static-qr/:zoneId
// Returns the permanent URL to embed in a physical QR code.
// This URL never changes and never expires.
router.get('/static-qr/:zoneId', async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const { zone } = req.query;
  const zoneName = decodeURIComponent(zone as string || zoneId);

  const permanentUrl = `http://localhost:3000/guest/scan/${zoneId}?zone=${encodeURIComponent(zoneName)}`;

  res.status(200).json({
    info: 'Embed this URL in your physical QR code. It never expires. Each scan creates a fresh 15-minute guest session.',
    permanentUrl,
    zone: { id: zoneId, name: zoneName },
  });
});

// ─── GENERATE TIMED QR TOKEN (called by staff/admin) ───────────────
// POST /guest/generate-qr
// Staff generates a QR for a specific zone. The QR embeds a signed token.
router.post('/generate-qr', async (req: Request, res: Response) => {
  const { zoneId, zoneName, propertyKey } = req.body;

  // Validate the property secret key
  if (propertyKey !== QR_PROPERTY_SECRET) {
    return res.status(403).json({
      error: 'INVALID_PROPERTY',
      message: 'This QR code was not generated by a registered property.'
    });
  }

  if (!zoneId || !zoneName) {
    return res.status(400).json({ error: 'zoneId and zoneName are required' });
  }

  try {
    // Create a signed JWT with expiry baked in
    const tokenPayload = {
      zoneId,
      zoneName,
      propertyId: 'grand-thalassa-hotel',
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'), // unique per QR generation
    };

    const qrToken = jwt.sign(tokenPayload, QR_PROPERTY_SECRET, {
      expiresIn: '15m',
      issuer: 'crisisync',
    });

    // The URL a guest will land on after scanning
    const guestUrl = `http://localhost:3000/guest/portal?token=${qrToken}`;

    res.status(200).json({
      success: true,
      qrToken,
      guestUrl,
      expiresIn: '15 minutes',
      zone: { id: zoneId, name: zoneName },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GUEST PORTAL LANDING PAGE ────────────────────────────────────
// GET /guest/portal?token=...
// Serves the guest HTML page. Validates token before rendering.
router.get('/portal', async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.send(buildErrorPage('Missing QR Token', 'This link is invalid. Please scan the QR code again.'));
  }

  try {
    const payload = jwt.verify(token, QR_PROPERTY_SECRET, { issuer: 'crisisync' }) as any;

    // Check if session is already active for this nonce (prevent link sharing)
    const sessionKey = `session_${payload.nonce}`;
    if (activeSessions[sessionKey]?.used) {
      return res.send(buildErrorPage(
        'Session Already Active',
        `This QR session is already in use. Each QR code can only be used once. Please ask a staff member to generate a new QR code for ${payload.zoneName}.`
      ));
    }

    // Mark session as active
    activeSessions[sessionKey] = {
      zoneId: payload.zoneId,
      zoneName: payload.zoneName,
      issuedAt: payload.issuedAt,
      used: true,
    };

    // Clean up old sessions
    const now = Date.now();
    Object.keys(activeSessions).forEach(k => {
      if (now - activeSessions[k].issuedAt > QR_SESSION_TTL_MS * 2) {
        delete activeSessions[k];
      }
    });

    // Create a short-lived session token for API calls from the guest page
    const sessionToken = jwt.sign(
      { zoneId: payload.zoneId, zoneName: payload.zoneName, nonce: payload.nonce },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.send(buildGuestPortalPage(payload.zoneName, payload.zoneId, sessionToken, token));
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.send(buildErrorPage(
        'QR Code Expired',
        'This QR code has expired (valid for 15 minutes only). Please ask a staff member to generate a new one or use the QR code at the nearest information point.'
      ));
    }
    return res.send(buildErrorPage(
      'Invalid QR Code',
      'This QR code is not recognized. It may have been generated outside this property. Please use an official QR code found in your room or lobby.'
    ));
  }
});

// ─── GUEST SENDS A MESSAGE / REPORT ──────────────────────────────
// POST /guest/message
router.post('/message', async (req: Request, res: Response) => {
  const { sessionToken, message } = req.body;

  if (!sessionToken || !message) {
    return res.status(400).json({ error: 'sessionToken and message are required' });
  }

  // Verify session token
  let sessionData: any;
  try {
    sessionData = jwt.verify(sessionToken, JWT_SECRET);
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Your session has expired. Please re-scan the QR code.' });
    }
    return res.status(401).json({ error: 'INVALID_SESSION', message: 'Invalid session.' });
  }

  const { zoneId, zoneName } = sessionData;

  // ── LAYER 5: Check if session is blacklisted ──
  if (blacklistedSessions.has(sessionToken)) {
    return res.status(403).json({
      error: 'SESSION_BLOCKED',
      message: 'This session has been blocked due to suspicious activity. Please speak to a staff member directly.'
    });
  }

  // ── LAYER 2: Per-session rate limiting (5 messages per 10 mins) ──
  const now = Date.now();
  const times = rateLimits[sessionToken] || [];
  const recentTimes = times.filter(t => now - t < 10 * 60 * 1000);
  if (recentTimes.length >= 5) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many messages. Please wait a moment or find a nearby staff member.' });
  }
  recentTimes.push(now);
  rateLimits[sessionToken] = recentTimes;

  // ── LAYER 3: Spam / abuse detection ──
  const isSpam = SPAM_PATTERNS.some(p => p.test(message.trim()));
  if (isSpam) {
    abuseScores[sessionToken] = (abuseScores[sessionToken] || 0) + 1;
    if (abuseScores[sessionToken] >= 3) {
      blacklistedSessions.add(sessionToken);
      return res.status(403).json({
        error: 'SESSION_BLOCKED',
        message: 'This session has been blocked due to repeated suspicious activity.'
      });
    }
    return res.status(200).json({
      aiReply: 'I\'m here to help with genuine questions or emergencies. Please describe your concern clearly.',
      classification: 'info',
      incidentCreated: false,
    });
  }
  try {
    // Step 1: Let Gemini classify the message
    const classification = await classifyIncident(message, zoneName);

    let aiReply = '';
    let incidentCreated = false;
    let incidentId = '';

    if (classification.severity === 'critical') {
      // EMERGENCY: Create incident immediately, alert staff
      incidentId = `INC-${Date.now()}`;
      const routingResult = await calculateRouting(zoneId, classification.severity, classification.category);

      const incident: Incident = {
        id: incidentId,
        title: `${classification.category.toUpperCase()} — Guest Alert (${zoneName})`,
        description: message,
        zoneId,
        severity: classification.severity,
        status: 'pending',
        createdBy: 'guest_portal',
        standbyResponders: routingResult.topResponders,
        createdAt: now,
        aiConfidence: classification.confidence,
        aiClassification: classification.category,
      };

      await db.ref(`incidents/${incidentId}`).set(incident);

      // Push real-time alert to all staff via Socket.IO
      const io = getIO();
      if (io) {
        io.of('/chat').emit('hardware_alert', {
          title: `🚨 Guest Emergency: ${classification.category.toUpperCase()}`,
          zone: zoneName,
          description: message,
          actionPlan: [classification.suggestedAction, 'Respond to guest immediately', 'Update incident status'],
        });
      }

      aiReply = `🚨 Emergency services have been alerted. Help is on the way to ${zoneName}. Please remain calm. ${classification.suggestedAction}. If you are in immediate danger, evacuate to the nearest exit.`;
      incidentCreated = true;
    } else if (classification.severity === 'warning') {
      // WARNING: Create incident + Gemini answers
      const aiResponse = await answerGuestQuestion(message);
      aiReply = `${aiResponse.answer} Our team has been notified and will assist you shortly.`;

      // Create lower-priority incident
      incidentId = `INC-${Date.now()}`;
      const incident: Incident = {
        id: incidentId,
        title: `Service Request — ${zoneName}`,
        description: message,
        zoneId,
        severity: 'warning',
        status: 'pending',
        createdBy: 'guest_portal',
        standbyResponders: [],
        createdAt: now,
        aiConfidence: classification.confidence,
        aiClassification: classification.category,
      };
      await db.ref(`incidents/${incidentId}`).set(incident);
      incidentCreated = true;
    } else {
      // INFO: Gemini just answers the question
      const aiResponse = await answerGuestQuestion(message);
      aiReply = aiResponse.answer;
    }

    res.status(200).json({
      aiReply,
      classification: classification.severity,
      incidentCreated,
      incidentId: incidentId || null,
      zoneName,
    });
  } catch (error: any) {
    console.error('Guest message error:', error);
    res.status(500).json({ error: 'Failed to process your message. Please find a staff member nearby.' });
  }
});

// ─── LEGACY ROUTES (kept for compatibility) ────────────────────────
router.post('/scan', async (req: Request, res: Response) => {
  const { zoneId } = req.body;
  const sessionToken = crypto.randomBytes(16).toString('hex');
  const snapshot = await db.ref(`zones/${zoneId}`).once('value');
  const zoneName = snapshot.val()?.name || 'Unknown Zone';
  res.status(200).json({ sessionToken, zoneName });
});

router.get('/report/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const reportSnap = await db.ref(`guestReports/${id}`).once('value');
    const report = reportSnap.val();
    if (!report) return res.status(404).json({ error: 'Not found' });
    if (report.incidentId) {
      const incidentSnap = await db.ref(`incidents/${report.incidentId}`).once('value');
      return res.status(200).json({ report, incident: incidentSnap.val() });
    }
    res.status(200).json({ report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// ─── HTML PAGE BUILDERS ────────────────────────────────────────────
function buildGuestPortalPage(zoneName: string, zoneId: string, sessionToken: string, qrToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CrisisSync Guest — ${zoneName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0B1120;
      color: #F1F5F9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: linear-gradient(135deg, #0E7490, #0891B2);
      padding: 20px 16px;
      text-align: center;
    }
    .header .logo { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: white; }
    .header .zone-badge {
      display: inline-block;
      margin-top: 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 13px;
      color: white;
    }
    .session-timer {
      background: #1A2332;
      border-bottom: 1px solid #2A3548;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: #94A3B8;
    }
    .timer-dot { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; }
    .msg.ai {
      background: #1A2332;
      border: 1px solid #22D3EE33;
      border-radius: 4px 16px 16px 16px;
      align-self: flex-start;
    }
    .msg.ai .label { font-size: 10px; font-weight: 700; color: #22D3EE; letter-spacing: 1px; margin-bottom: 6px; }
    .msg.guest {
      background: #0E7490;
      border-radius: 16px 4px 16px 16px;
      align-self: flex-end;
      color: white;
    }
    .msg.system {
      align-self: center;
      background: #1A2332;
      border: 1px solid #2A3548;
      border-radius: 20px;
      font-size: 11px;
      color: #64748B;
      padding: 6px 14px;
    }
    .msg.emergency {
      background: linear-gradient(135deg, #991B1B, #7F1D1D);
      border: 1px solid #EF444455;
      color: white;
      border-radius: 12px;
    }
    .input-area {
      background: #111827;
      border-top: 1px solid #2A3548;
      padding: 12px 16px 28px;
    }
    .sos-btn {
      width: 100%;
      background: linear-gradient(135deg, #EF4444, #DC2626);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .input-row { display: flex; gap: 8px; }
    .input-row textarea {
      flex: 1;
      background: #1A2332;
      border: 1px solid #2A3548;
      border-radius: 12px;
      padding: 12px;
      color: #F1F5F9;
      font-size: 14px;
      resize: none;
      height: 48px;
      line-height: 1.4;
    }
    .input-row textarea:focus { outline: none; border-color: #22D3EE; }
    .input-row button {
      background: linear-gradient(135deg, #0891B2, #0E7490);
      color: white;
      border: none;
      border-radius: 12px;
      width: 48px;
      cursor: pointer;
      font-size: 18px;
    }
    .expired-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 100;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .expired-box { background: #111827; border: 2px solid #EF4444; border-radius: 20px; padding: 32px 24px; max-width: 320px; }
    .expired-box h2 { color: #EF4444; margin-bottom: 12px; }
    .expired-box p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ CrisisSync</div>
    <div class="zone-badge">📍 ${zoneName}</div>
  </div>
  <div class="session-timer">
    <div class="timer-dot"></div>
    <span>Secure session • Expires in <span id="countdown">15:00</span></span>
    <span id="locationBadge" style="margin-left:12px;font-size:11px;color:#64748B;">📍 Checking location...</span>
  </div>
  <div class="messages" id="messages">
    <div class="msg system">Session started for ${zoneName}</div>
    <div class="msg ai">
      <div class="label">✦ CrisisSync AI</div>
      Hello! I'm the AI assistant for ${zoneName}. You can ask me any question or report an emergency. How can I help you?
    </div>
  </div>
  <div class="input-area">
    <button class="sos-btn" onclick="sendSOS()">🚨 EMERGENCY — TAP HERE</button>
    <div class="input-row">
      <textarea id="msgInput" placeholder="Type your message or question..." rows="1"></textarea>
      <button onclick="sendMessage()">➤</button>
    </div>
  </div>
  <div class="expired-overlay" id="expiredOverlay">
    <div class="expired-box">
      <h2>⏰ Session Expired</h2>
      <p>This QR session has expired after 15 minutes for your security.<br><br>Please re-scan the QR code or ask a staff member for assistance.</p>
    </div>
  </div>

  <script>
    const SESSION_TOKEN = '${sessionToken}';
    const SESSION_TTL = 15 * 60; // seconds
    let secondsLeft = SESSION_TTL;
    let locationTrust = 'pending';

    // ── LAYER 6: GPS Two-Way Verification ──
    function verifyLocation() {
      if (!navigator.geolocation) {
        updateLocationBadge('no_gps');
        sendLocationToServer(null, null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const r = await fetch('/guest/verify-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: SESSION_TOKEN, lat: latitude, lng: longitude })
            });
            const data = await r.json();
            if (data.verified) {
              locationTrust = 'verified';
              updateLocationBadge('verified', data.distance);
            } else if (data.reason === 'OUTSIDE_PROPERTY') {
              locationTrust = 'outside';
              updateLocationBadge('outside', data.distance);
              addMessage('⚠️ ' + data.message + ' Your session has been flagged.', 'system');
            }
          } catch (e) { sendLocationToServer(null, null); }
        },
        async () => {
          locationTrust = 'denied';
          updateLocationBadge('denied');
          await sendLocationToServer(null, null);
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    }

    async function sendLocationToServer(lat, lng) {
      try {
        await fetch('/guest/verify-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: SESSION_TOKEN, lat, lng })
        });
      } catch (e) {}
    }

    function updateLocationBadge(status, distance) {
      const badge = document.getElementById('locationBadge');
      if (!badge) return;
      const labels = {
        verified: ['📍 Location Verified' + (distance ? ' (' + distance + 'm)' : ''), '#22C55E'],
        outside:  ['⚠️ Outside Property (' + distance + 'm away)', '#FBBF24'],
        denied:   ['📍 Location Not Shared', '#64748B'],
        no_gps:   ['📍 GPS Unavailable', '#64748B'],
      };
      const [text, color] = labels[status] || ['📍 Unknown', '#64748B'];
      badge.textContent = text;
      badge.style.color = color;
    }

    verifyLocation();

    // Countdown timer
    const countdownEl = document.getElementById('countdown');
    const timer = setInterval(() => {
      secondsLeft--;
      const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const s = (secondsLeft % 60).toString().padStart(2, '0');
      countdownEl.textContent = m + ':' + s;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        document.getElementById('expiredOverlay').style.display = 'flex';
        document.querySelector('.input-area').style.opacity = '0.3';
        document.querySelector('.input-area').style.pointerEvents = 'none';
      }
    }, 1000);

    function addMessage(text, type) {
      const msgs = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'msg ' + type;
      if (type === 'ai') {
        div.innerHTML = '<div class="label">✦ CrisisSync AI</div>' + text;
      } else {
        div.textContent = text;
      }
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    async function sendMessage() {
      if (secondsLeft <= 0) return;
      const input = document.getElementById('msgInput');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      addMessage(msg, 'guest');
      addMessage('Processing your message...', 'system');

      try {
        const res = await fetch('/guest/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: SESSION_TOKEN, message: msg })
        });
        const data = await res.json();
        // Remove the "processing" message
        const msgs = document.getElementById('messages');
        msgs.removeChild(msgs.lastChild);
        if (data.error) {
          addMessage(data.message || data.error, 'system');
        } else {
          const type = data.classification === 'critical' ? 'emergency' : 'ai';
          addMessage(data.aiReply, type);
        }
      } catch (e) {
        addMessage('Connection error. Please try again.', 'system');
      }
    }

    function sendSOS() {
      if (secondsLeft <= 0) return;
      document.getElementById('msgInput').value = '🚨 EMERGENCY! I need immediate help!';
      sendMessage();
    }

    document.getElementById('msgInput').addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  </script>
</body>
</html>`;
}

function buildErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CrisisSync — ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0B1120;
      color: #F1F5F9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .box {
      background: #111827;
      border: 2px solid #EF4444;
      border-radius: 20px;
      padding: 40px 28px;
      max-width: 360px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #EF4444; font-size: 20px; margin-bottom: 12px; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.7; }
    .help { margin-top: 24px; padding: 16px; background: #1A2332; border-radius: 12px; font-size: 13px; color: #64748B; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="help">For immediate assistance, please contact the front desk or dial the emergency number posted in your room.</div>
  </div>
</body>
</html>`;
}
