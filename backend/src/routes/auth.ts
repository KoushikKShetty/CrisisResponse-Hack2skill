import { Request, Response, Router } from 'express';
import { auth, db } from '../utils/firebase';

const router = Router();

// Mock signup for staff (admin only)
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, certifications, zone } = req.body;
    // In a real app, we'd use auth.createUser
    // For demo, we just return a mock response or create it if not using mock
    res.status(201).json({ message: 'User created successfully', userId: 'mock-user-id' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  // Client authenticates with Firebase directly, backend verifies token or just starts shift
  res.status(200).json({ token: 'mock-jwt-token' });
});

router.post('/start-shift', async (req: Request, res: Response) => {
  const { userId } = req.body; // should come from auth middleware
  try {
    await db.ref(`staff/${userId}`).update({ shiftActive: true });
    res.status(200).json({ message: 'Shift started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/end-shift', async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    // Check if user has active incidents
    const incidentsSnapshot = await db.ref('incidents').orderByChild('assignedTo').equalTo(userId).once('value');
    const incidents = incidentsSnapshot.val();
    
    let hasActive = false;
    if (incidents) {
      for (const id in incidents) {
        if (incidents[id].status !== 'resolved' && incidents[id].status !== 'false_alarm') {
          hasActive = true;
          break;
        }
      }
    }

    if (hasActive) {
      return res.status(400).json({ error: 'Cannot end shift with active incidents. Hand off first.' });
    }

    await db.ref(`staff/${userId}`).update({ shiftActive: false, status: 'offline' });
    res.status(200).json({ message: 'Shift ended' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
