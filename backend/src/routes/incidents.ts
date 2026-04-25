import { Request, Response, Router } from 'express';
import { db } from '../utils/firebase';
import { calculateRouting } from '../services/routingService';
import { v4 as uuidv4 } from 'uuid'; // need to add uuid to package.json later if we use it, but for now we can just use Date.now().toString()
import { Incident } from '../../../shared/types';

const router = Router();

// Create new incident
router.post('/', async (req: Request, res: Response) => {
  const { title, description, zoneId, severity, createdBy, type } = req.body;
  
  try {
    const id = Date.now().toString(); // simple ID generation
    
    // Call routing engine
    const routingResult = await calculateRouting(zoneId, severity, type);
    
    const incident: Incident = {
      id,
      title,
      description,
      zoneId,
      severity,
      status: 'pending',
      createdBy,
      standbyResponders: routingResult.topResponders,
      createdAt: Date.now()
    };

    await db.ref(`incidents/${id}`).set(incident);

    // If supervisor needs to be notified, we could trigger a push notification here or write to a 'notifications' node
    if (routingResult.notifySupervisor) {
       console.log(`[Alert] Escalating to supervisor for incident ${id}`);
       // TODO: notify supervisor logic
    }

    res.status(201).json({ message: 'Incident created', incident, routing: routingResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get incidents
router.get('/', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.ref('incidents').once('value');
    res.status(200).json(snapshot.val() || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept incident (first click wins)
router.post('/:id/accept', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const incidentRef = db.ref(`incidents/${id}`);
    
    // Use transaction to prevent race conditions
    const transactionResult = await incidentRef.transaction((currentData) => {
      if (currentData) {
        if (currentData.status === 'pending') {
          currentData.status = 'assigned';
          currentData.assignedTo = userId;
          currentData.assignedAt = Date.now();
          // Remove assigned user from standby if they were there
          if (currentData.standbyResponders) {
            currentData.standbyResponders = currentData.standbyResponders.filter((uid: string) => uid !== userId);
          }
          return currentData;
        } else {
          return undefined; // abort transaction
        }
      }
      return null;
    });

    if (transactionResult.committed) {
      res.status(200).json({ message: 'Incident accepted', incident: transactionResult.snapshot.val() });
    } else {
      res.status(409).json({ error: 'Incident already assigned or resolved.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve incident
router.post('/:id/resolve', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.ref(`incidents/${id}`).update({
      status: 'resolved',
      resolvedAt: Date.now()
    });
    res.status(200).json({ message: 'Incident resolved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark false alarm
router.post('/:id/false-alarm', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.ref(`incidents/${id}`).update({
      status: 'false_alarm',
      resolvedAt: Date.now()
    });
    res.status(200).json({ message: 'Marked as false alarm' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Escalate
router.post('/:id/escalate', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.ref(`incidents/${id}/escalated`).set(true);
    // TODO: Broadcast to supervisor
    res.status(200).json({ message: 'Incident escalated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
