import { Request, Response, Router } from 'express';
import { db } from '../utils/firebase';

const router = Router();

// Heartbeat endpoint for 3-signal availability
router.post('/heartbeat', async (req: Request, res: Response) => {
  const { userId, wifiConnected, cellularFallback, currentZoneId } = req.body;
  const now = Date.now();

  try {
    let status = 'offline';
    if (wifiConnected) {
      status = 'available';
    } else if (cellularFallback) {
      status = 'limited';
    }

    await db.ref(`staff/${userId}`).update({
      lastHeartbeat: now,
      wifiConnected,
      status,
      zone: currentZoneId
    });

    res.status(200).json({ status: 'ok', currentStatus: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update zone manually
router.put('/zone', async (req: Request, res: Response) => {
  const { userId, zoneId } = req.body;
  try {
    await db.ref(`staff/${userId}`).update({ zone: zoneId });
    res.status(200).json({ message: 'Zone updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all staff
router.get('/', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.ref('staff').once('value');
    res.status(200).json(snapshot.val() || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List available staff
router.get('/available', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.ref('staff').orderByChild('status').equalTo('available').once('value');
    res.status(200).json(snapshot.val() || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
