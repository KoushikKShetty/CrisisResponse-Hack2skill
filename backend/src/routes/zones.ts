import { Request, Response, Router } from 'express';
import { db } from '../utils/firebase';

const router = Router();

// List all zones
router.get('/', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.ref('zones').once('value');
    res.status(200).json(snapshot.val() || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
