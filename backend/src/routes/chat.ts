import { Request, Response, Router } from 'express';
import { db } from '../utils/firebase';

const router = Router();

// GET /chat/:incidentId/history
router.get('/:incidentId/history', async (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const messagesSnap = await db.ref(`chat/${incidentId}`)
      .orderByChild('timestamp')
      .limitToLast(limit)
      .once('value');
    
    const messagesData = messagesSnap.val() || {};
    const messages = Object.values(messagesData);
    messages.sort((a: any, b: any) => a.timestamp - b.timestamp);

    res.status(200).json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /chat/:incidentId/mark-read
router.post('/:incidentId/mark-read', async (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await db.ref(`chatReadStatus/${incidentId}/${userId}`).set({
      lastReadAt: Date.now()
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
