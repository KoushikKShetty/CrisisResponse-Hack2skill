import { db } from '../utils/firebase';
import { getIO } from './socketService';

// ─── CONFIDENCE THRESHOLDS ──────────────────────────────────────────
const THRESHOLD_ZONE_ONLY = 0.50;   // below this: BLE nearby staff only
const THRESHOLD_ALL_STAFF = 0.80;   // below this: all on-duty staff
// above 0.80 → first responders contacted

export type EscalationLevel = 'zone_only' | 'all_staff' | 'first_responders';

export interface EscalationResult {
  level: EscalationLevel;
  confidence: number;
  notifiedStaff: string[];
  firstRespondersCalled: boolean;
  responderTypes: string[];
  timeline: EscalationEvent[];
  message: string;
}

export interface EscalationEvent {
  timestamp: string;
  action: string;
  actor: string;
}

// ─── MOCK BLE STAFF DATABASE ────────────────────────────────────────
// In production, this comes from Firebase RTDB updated by BLE beacons
const BLE_STAFF_ZONES: Record<string, { id: string; name: string; role: string }[]> = {
  'kitchen-alpha': [
    { id: 'mc', name: 'Marcus Chen', role: 'Security Lead' },
    { id: 'dp', name: 'David Park', role: 'Fire Safety' },
  ],
  'lobby': [
    { id: 'sm', name: 'Sarah Miller', role: 'Medic' },
  ],
  'pool': [
    { id: 'lt', name: 'Lisa Tran', role: 'Maintenance' },
  ],
  'parking': [],
  'restaurant': [],
};

// ─── MOCK FIRST RESPONDER TYPES BY INCIDENT ─────────────────────────
const RESPONDER_TYPES: Record<string, string[]> = {
  'fire':     ['🚒 Fire Department', '🚑 Ambulance'],
  'medical':  ['🚑 Ambulance', '🏥 Medical Team'],
  'security': ['🚔 Police', '🛡️ Security Command'],
  'flood':    ['🚒 Fire Department', '🏛️ Civil Emergency'],
  'default':  ['🚑 Ambulance', '🚒 Fire Department', '🚔 Police'],
};

// ─── MAIN ESCALATION FUNCTION ───────────────────────────────────────
export async function escalateIncident(params: {
  incidentId: string;
  type: string;
  zone: string;
  zoneId: string;
  description: string;
  confidence: number;          // 0.0 – 1.0
  actionPlan: string[];
  source: 'hardware' | 'guest_qr' | 'staff';
}): Promise<EscalationResult> {
  const {
    incidentId, type, zone, zoneId,
    description, confidence, actionPlan, source,
  } = params;

  const timeline: EscalationEvent[] = [];
  const now = new Date().toISOString();
  const io = getIO();

  // Record detection event
  timeline.push({
    timestamp: now,
    action: `Incident detected via ${source === 'hardware' ? 'IoT Sensor' : source === 'guest_qr' ? 'Guest QR Portal' : 'Staff Report'}`,
    actor: 'CrisisSync AI',
  });

  // ── LEVEL 1: BLE ZONE STAFF (always happens) ─────────────────────
  const nearbyStaff = BLE_STAFF_ZONES[zoneId] || [];
  const notifiedStaff: string[] = nearbyStaff.map(s => s.name);

  if (nearbyStaff.length > 0) {
    timeline.push({
      timestamp: new Date().toISOString(),
      action: `BLE zone alert sent to ${nearbyStaff.length} staff in ${zone}`,
      actor: 'BLE Zone System',
    });

    if (io) {
      io.of('/chat').emit('zone_alert', {
        incidentId,
        zone,
        type,
        description,
        actionPlan,
        confidence,
        targetStaff: nearbyStaff.map(s => s.id),
        message: `⚡ Zone Alert: ${type.toUpperCase()} in your zone (${zone}). You are the nearest responder.`,
      });
    }
  }

  // Determine escalation level
  let level: EscalationLevel = 'zone_only';
  let firstRespondersCalled = false;
  let responderTypes: string[] = [];

  // ── LEVEL 2: ALL STAFF (confidence ≥ 50%) ────────────────────────
  if (confidence >= THRESHOLD_ZONE_ONLY) {
    level = 'all_staff';
    timeline.push({
      timestamp: new Date().toISOString(),
      action: `All on-duty staff alerted (confidence: ${Math.round(confidence * 100)}%)`,
      actor: 'CrisisSync AI',
    });

    if (io) {
      io.of('/chat').emit('hardware_alert', {
        title: `${type.toUpperCase()} — ${zone}`,
        zone,
        description,
        actionPlan,
        confidence: Math.round(confidence * 100),
        severity: confidence >= THRESHOLD_ALL_STAFF ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  // ── LEVEL 3: FIRST RESPONDERS (confidence ≥ 80%) ─────────────────
  if (confidence >= THRESHOLD_ALL_STAFF) {
    level = 'first_responders';
    firstRespondersCalled = true;
    responderTypes = RESPONDER_TYPES[type.toLowerCase()] || RESPONDER_TYPES['default'];

    timeline.push({
      timestamp: new Date().toISOString(),
      action: `First responders contacted: ${responderTypes.join(', ')}`,
      actor: 'Emergency Dispatch',
    });

    timeline.push({
      timestamp: new Date().toISOString(),
      action: `Incident details + GPS coordinates transmitted to dispatch`,
      actor: 'CrisisSync Dispatch Bridge',
    });

    // Notify Flutter app of responder dispatch
    if (io) {
      io.of('/chat').emit('responders_dispatched', {
        incidentId,
        zone,
        responderTypes,
        eta: `${3 + Math.floor(Math.random() * 5)} minutes`,
        message: `🚨 Emergency services dispatched to ${zone}. ETA: ${3 + Math.floor(Math.random() * 5)} min`,
      });
    }
  }

  // ── SAVE ESCALATION LOG TO FIREBASE ────────────────────────────────
  const result: EscalationResult = {
    level,
    confidence,
    notifiedStaff,
    firstRespondersCalled,
    responderTypes,
    timeline,
    message: _buildSummaryMessage(level, zone, confidence, responderTypes),
  };

  await db.ref(`incidents/${incidentId}/escalation`).set(result);
  await db.ref(`incidents/${incidentId}/status`).set(
    level === 'first_responders' ? 'escalated' : 'active'
  );

  console.log(`[Escalation] ${incidentId} → ${level.toUpperCase()} (${Math.round(confidence * 100)}%)`);
  return result;
}

// ─── GENERATE INCIDENT REPORT ────────────────────────────────────────
export async function generateIncidentReport(incidentId: string): Promise<object | null> {
  try {
    const snap = await db.ref(`incidents/${incidentId}`).once('value');
    const incident = snap.val();
    if (!incident) return null;

    const resolved = incident.status === 'resolved';
    const createdAt = new Date(incident.createdAt);
    const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt) : new Date();
    const durationMin = Math.round((resolvedAt.getTime() - createdAt.getTime()) / 60000);

    return {
      reportId: `RPT-${incidentId}`,
      generatedAt: new Date().toISOString(),
      incident: {
        id: incidentId,
        title: incident.title,
        type: incident.aiClassification,
        zone: incident.zoneId,
        severity: incident.severity,
        description: incident.description,
        source: incident.createdBy,
        detectedAt: createdAt.toISOString(),
        resolvedAt: resolved ? resolvedAt.toISOString() : null,
        durationMinutes: resolved ? durationMin : null,
      },
      escalation: incident.escalation || null,
      aiAssessment: {
        confidence: `${Math.round((incident.aiConfidence || 0.85) * 100)}%`,
        classification: incident.aiClassification,
        actionPlan: incident.escalation?.timeline?.map((e: EscalationEvent) => e.action) || [],
      },
      outcome: resolved ? 'RESOLVED' : 'ONGOING',
    };
  } catch (err) {
    console.error('Failed to generate report:', err);
    return null;
  }
}

function _buildSummaryMessage(
  level: EscalationLevel,
  zone: string,
  confidence: number,
  responderTypes: string[]
): string {
  const pct = Math.round(confidence * 100);
  if (level === 'first_responders') {
    return `CRITICAL (${pct}% confidence): Emergency services dispatched to ${zone}. ${responderTypes.join(', ')} en route.`;
  }
  if (level === 'all_staff') {
    return `HIGH (${pct}% confidence): All on-duty staff alerted for incident in ${zone}.`;
  }
  return `MODERATE (${pct}% confidence): BLE-nearest staff in ${zone} notified only.`;
}
