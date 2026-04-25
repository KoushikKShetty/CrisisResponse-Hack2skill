import { db } from '../utils/firebase';

export const startEscalationMonitor = () => {
  // Run every 10 seconds
  setInterval(async () => {
    try {
      const now = Date.now();
      const snapshot = await db.ref('incidents').orderByChild('status').equalTo('pending').once('value');
      const incidents = snapshot.val();

      if (!incidents) return;

      const updates: { [key: string]: any } = {};

      for (const incidentId in incidents) {
        const incident = incidents[incidentId];
        const timePending = now - (incident.createdAt || 0);

        if (timePending > 60000 && !incident.escalatedToAll) {
          // 60s old -> broadcast to all available staff in same + adjacent zones
          updates[`incidents/${incidentId}/escalatedToAll`] = true;
          console.log(`[Escalation] Incident ${incidentId} pending > 60s. Broadcasting to all nearby staff.`);
        } else if (timePending > 30000 && !incident.escalatedToSupervisor) {
          // 30s old -> notify supervisor
          updates[`incidents/${incidentId}/escalatedToSupervisor`] = true;
          console.log(`[Escalation] Incident ${incidentId} pending > 30s. Notifying supervisor.`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    } catch (error) {
      console.error('[Escalation] Error checking escalations:', error);
    }
  }, 10000);
};
