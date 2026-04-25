import express from 'express';
import { db } from '../utils/firebase';
import { generateEmergencyProtocol } from '../services/gemmaService';
import { processDailyNews } from '../services/newsListener';
import { escalateIncident, generateIncidentReport } from '../services/escalationService';

const router = express.Router();

// ─── MOCK HARDWARE SENSOR EVENT ────────────────────────────────────
// POST /mock/hardware-event
// Simulates an IoT sensor trigger (smoke, temperature, flood, etc.)
// Confidence determines escalation tier:
//   < 50%  → BLE nearby staff only
//   50–80% → All on-duty staff
//   > 80%  → First responders contacted
router.post('/hardware-event', async (req, res) => {
  try {
    const {
      sensorId,
      zone,
      zoneId,
      type,
      description,
      confidence, // optional override 0.0–1.0 (default: 0.9 for hardware = critical)
    } = req.body;

    if (!sensorId || !zone || !type) {
      return res.status(400).json({ error: 'Missing required fields: sensorId, zone, type' });
    }

    // Hardware sensors default to HIGH confidence (0.92)
    // since they are precision instruments
    const confidenceScore: number = typeof confidence === 'number'
      ? Math.min(1, Math.max(0, confidence))
      : 0.92;

    // 1. Generate AI Action Plan via Gemma
    const actionPlan = await generateEmergencyProtocol(type, zone, description || '');

    // 2. Create incident record in Firebase
    const incidentData = {
      title: `Hardware Alert: ${type.toUpperCase()}`,
      description: description || `Automated alert triggered by sensor ${sensorId}`,
      zone,
      zoneId: zoneId || zone.toLowerCase().replace(/\s+/g, '-'),
      type,
      status: 'active',
      severity: confidenceScore >= 0.8 ? 'critical' : confidenceScore >= 0.5 ? 'warning' : 'info',
      createdAt: new Date().toISOString(),
      aiConfidence: confidenceScore,
      aiClassification: type,
      createdBy: `sensor:${sensorId}`,
      actionPlan,
    };

    const ref = db.ref('incidents').push();
    await ref.set(incidentData);
    const incidentId = ref.key!;

    // 3. Smart escalation based on confidence tier
    const escalation = await escalateIncident({
      incidentId,
      type,
      zone,
      zoneId: zoneId || zone.toLowerCase().replace(/\s+/g, '-'),
      description: incidentData.description,
      confidence: confidenceScore,
      actionPlan,
      source: 'hardware',
    });

    res.status(200).json({
      success: true,
      incident: { id: incidentId, ...incidentData },
      escalation: {
        level: escalation.level,
        confidence: `${Math.round(confidenceScore * 100)}%`,
        notifiedStaff: escalation.notifiedStaff,
        firstRespondersCalled: escalation.firstRespondersCalled,
        responderTypes: escalation.responderTypes,
        message: escalation.message,
      },
    });

  } catch (error) {
    console.error('Error processing hardware event:', error);
    res.status(500).json({ error: 'Failed to process hardware event' });
  }
});

// ─── MOCK NEWS TRIGGER ─────────────────────────────────────────────
// POST /mock/trigger-news
router.post('/trigger-news', async (req, res) => {
  try {
    const { useMock } = req.body;
    const newsData = await processDailyNews(useMock !== false);
    res.status(200).json({ success: true, news: newsData });
  } catch (error) {
    console.error('Error triggering news:', error);
    res.status(500).json({ error: 'Failed to process news event' });
  }
});

// ─── INCIDENT REPORT ──────────────────────────────────────────────
// GET /mock/report/:incidentId
router.get('/report/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const report = await generateIncidentReport(incidentId);
    if (!report) return res.status(404).json({ error: 'Incident not found' });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ─── RESOLVE INCIDENT ─────────────────────────────────────────────
// POST /mock/resolve/:incidentId
router.post('/resolve/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;
    await db.ref(`incidents/${incidentId}`).update({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    const report = await generateIncidentReport(incidentId);
    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
});

export default router;
