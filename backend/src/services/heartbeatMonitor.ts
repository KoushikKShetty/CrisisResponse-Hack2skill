import { db } from '../utils/firebase';

export const startHeartbeatMonitor = () => {
  // Run every 30 seconds
  setInterval(async () => {
    try {
      const now = Date.now();
      const snapshot = await db.ref('staff').once('value');
      const staffList = snapshot.val();

      if (!staffList) return;

      const updates: { [key: string]: any } = {};

      for (const userId in staffList) {
        const staff = staffList[userId];
        if (staff.status !== 'offline' && staff.shiftActive) {
          const timeSinceLastHeartbeat = now - (staff.lastHeartbeat || 0);
          
          if (timeSinceLastHeartbeat > 90000) { // 90 seconds
            updates[`staff/${userId}/status`] = 'offline';
            updates[`staff/${userId}/wifiConnected`] = false;
            console.log(`[Monitor] Staff ${userId} marked offline due to stale heartbeat.`);
          } else if (timeSinceLastHeartbeat > 30000 && staff.wifiConnected) { // between 30-90s, mark limited if they were available
             // This is optional logic based on 'cellular fallback' missing, but we'll stick to 90s for offline
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    } catch (error) {
      console.error('[Monitor] Error checking stale heartbeats:', error);
    }
  }, 30000);
};
