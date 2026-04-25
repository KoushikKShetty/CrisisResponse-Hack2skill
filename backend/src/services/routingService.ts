import { db } from '../utils/firebase';
import { Severity, User, Zone } from '../../../shared/types';

interface RoutingResult {
  topResponders: string[];
  notifySupervisor: boolean;
}

export const calculateRouting = async (
  incidentZoneId: string,
  severity: Severity,
  incidentType: string
): Promise<RoutingResult> => {
  try {
    const staffSnapshot = await db.ref('staff').once('value');
    const staffList: Record<string, User> = staffSnapshot.val() || {};

    const zoneSnapshot = await db.ref(`zones/${incidentZoneId}`).once('value');
    const incidentZone: Zone = zoneSnapshot.val();
    
    // Map of role matching
    const roleMatchMap: Record<string, string[]> = {
      'fire': ['fire_marshal', 'fire_safety'],
      'medical': ['first_aid', 'emt_b'],
      'security': ['security']
    };
    const requiredCerts = roleMatchMap[incidentType] || [];

    const candidates = [];
    const now = Date.now();

    for (const userId in staffList) {
      const staff = staffList[userId];
      
      // Step 1: Filter
      const isAvailable = staff.status === 'available' || (staff.status === 'limited' && severity === 'critical');
      if (!isAvailable || !staff.shiftActive) continue;

      // Step 2: Score
      let score = 0;

      // Zone match
      if (staff.zone === incidentZoneId) {
        score += 100;
      } else if (incidentZone && incidentZone.adjacentZones && incidentZone.adjacentZones.includes(staff.zone)) {
        score += 50;
      } else {
        score += 10;
      }

      // Role match
      const hasCert = requiredCerts.some(cert => (staff.certifications || []).includes(cert));
      if (hasCert) {
        score += 50;
      }

      // Availability boost
      if (now - staff.lastHeartbeat <= 15000) {
        score += 20;
      }

      candidates.push({ userId, score, isSameZone: staff.zone === incidentZoneId });
    }

    // Step 3: Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const topResponders = candidates.slice(0, 3).map(c => c.userId);

    // Step 4: Supervisor notification rule
    let notifySupervisor = false;
    if (severity === 'critical') {
      const topResponder = candidates[0];
      if (!topResponder || !topResponder.isSameZone) {
        notifySupervisor = true;
      }
    }

    return { topResponders, notifySupervisor };
  } catch (error) {
    console.error('Error in smart routing:', error);
    return { topResponders: [], notifySupervisor: false };
  }
};
