import { User, Zone } from '../../../shared/types';

const testSmartRouting = () => {
  console.log('🧪 TESTING SMART ROUTING ENGINE (DAY 3)');
  console.log('Incident: Kitchen Smoke Detected (Fire, Critical)\n');

  const now = Date.now();

  const staffList: Record<string, any> = {
    "staff_1": { id: "staff_1", name: "Gordon (Kitchen Supervisor)", role: "supervisor", zone: "zone_kitchen", status: "available", shiftActive: true, lastHeartbeat: now - 5000, certifications: ["fire_safety", "first_aid"], roleType: "supervisor" },
    "staff_2": { id: "staff_2", name: "John (Waitstaff)", role: "waitstaff", zone: "zone_kitchen", status: "available", shiftActive: true, lastHeartbeat: now - 20000, certifications: [], roleType: "staff" },
    "staff_3": { id: "staff_3", name: "Mike (Security)", role: "security", zone: "zone_lobby", status: "available", shiftActive: true, lastHeartbeat: now - 1000, certifications: ["security", "first_aid"], roleType: "security" },
    "staff_4": { id: "staff_4", name: "Sarah (Manager)", role: "manager", zone: "zone_lobby", status: "available", shiftActive: true, lastHeartbeat: now - 5000, certifications: ["fire_marshal"], roleType: "supervisor" },
    "staff_5": { id: "staff_5", name: "Anna (Medic)", role: "medic", zone: "zone_pool", status: "available", shiftActive: true, lastHeartbeat: now - 10000, certifications: ["emt_b"], roleType: "medic" },
    "staff_6": { id: "staff_6", name: "Bob (Sous Chef)", role: "cook", zone: "zone_kitchen", status: "offline", shiftActive: false, lastHeartbeat: now - 60000, certifications: ["fire_safety"], roleType: "staff" }
  };

  const incidentZone: any = {
    id: "zone_kitchen",
    name: "Kitchen Alpha",
    type: "kitchen",
    adjacentZones: ["zone_lobby"]
  };

  const incidentZoneId = "zone_kitchen";
  const severity = 'critical';
  const incidentType = 'fire'; // requires 'fire_marshal' or 'fire_safety'

  const roleMatchMap: Record<string, string[]> = {
    'fire': ['fire_marshal', 'fire_safety'],
    'medical': ['first_aid', 'emt_b'],
    'security': ['security']
  };
  const requiredCerts = roleMatchMap[incidentType] || [];

  const candidates = [];

  console.log('🔍 Scoring Candidates:');
  for (const userId in staffList) {
    const staff = staffList[userId];
    
    // Step 1: Filter
    const isAvailable = staff.status === 'available' || (staff.status === 'limited' && severity === 'critical');
    if (!isAvailable || !staff.shiftActive) {
      console.log(`- ${staff.name}: Disqualified (Offline or Shift Inactive)`);
      continue;
    }

    // Step 2: Score
    let score = 0;
    const scoreLog = [];

    // Zone match
    if (staff.zone === incidentZoneId) {
      score += 100;
      scoreLog.push('Zone Match (+100)');
    } else if (incidentZone.adjacentZones && incidentZone.adjacentZones.includes(staff.zone)) {
      score += 50;
      scoreLog.push('Adjacent Zone (+50)');
    } else {
      score += 10;
      scoreLog.push('Distant Zone (+10)');
    }

    // Role match
    const hasCert = requiredCerts.some(cert => (staff.certifications || []).includes(cert));
    if (hasCert) {
      score += 50;
      scoreLog.push('Role/Cert Match (+50)');
    }

    // Availability boost
    if (now - staff.lastHeartbeat <= 15000) {
      score += 20;
      scoreLog.push('Heartbeat Active (+20)');
    }

    console.log(`- ${staff.name}: Total Score: ${score} [${scoreLog.join(', ')}]`);
    candidates.push({ userId, name: staff.name, score, isSameZone: staff.zone === incidentZoneId });
  }

  // Step 3: Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const topResponders = candidates.slice(0, 3);

  // Step 4: Supervisor notification rule
  let notifySupervisor = false;
  if (severity === 'critical') {
    const topResponder = candidates[0];
    if (!topResponder || !topResponder.isSameZone) {
      notifySupervisor = true;
    }
  }

  console.log('\n✅ FINAL ROUTING RESULT:');
  console.log(`Top 3 Responders Assigned:`);
  topResponders.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (Score: ${r.score})`));
  console.log(`Supervisor Auto-Escalation Needed: ${notifySupervisor ? 'YES (No responder in exact zone)' : 'NO (Top responder is in zone)'}`);
};

testSmartRouting();
