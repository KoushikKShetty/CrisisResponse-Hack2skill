import { db } from '../utils/firebase';
import { calculateRouting } from '../services/routingService';
import { classifyIncident } from '../services/aiClassifier';
import { User, Zone, Incident } from '../../../shared/types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const runGoldenPath = async () => {
  console.log('\n🚀 INITIATING CRISIS RESPONDER GOLDEN PATH DEMO\n');
  const now = Date.now();

  try {
    // 1. SEED DATA
    console.log('📡 [1/5] Seeding Firebase Database with Zones and Staff...');
    const zones = {
      'zone_kitchen': { id: 'zone_kitchen', name: 'Kitchen Alpha', type: 'kitchen', adjacentZones: ['zone_lobby'], sectorId: 'hotel', activeStaff: [] },
      'zone_lobby': { id: 'zone_lobby', name: 'Main Lobby', type: 'public', adjacentZones: ['zone_kitchen'], sectorId: 'hotel', activeStaff: [] },
    };
    
    const staff = {
      "staff_marcus": { id: "staff_marcus", name: "Marcus Chen", role: "security", zone: "zone_kitchen", status: "available", shiftActive: true, lastHeartbeat: now, certifications: ["security", "fire_safety", "first_aid"], currentIncidentId: null, roleType: "supervisor", wifiConnected: true },
      "staff_alex": { id: "staff_alex", name: "Alex Rivera", role: "supervisor", zone: "zone_lobby", status: "available", shiftActive: true, lastHeartbeat: now, certifications: ["fire_marshal"], currentIncidentId: null, roleType: "supervisor", wifiConnected: true },
      "staff_jordan": { id: "staff_jordan", name: "Jordan Smith", role: "security", zone: "zone_lobby", status: "available", shiftActive: true, lastHeartbeat: now, certifications: [], currentIncidentId: null, roleType: "staff", wifiConnected: true },
      "staff_bob": { id: "staff_bob", name: "Bob (Off Shift)", role: "cook", zone: "zone_kitchen", status: "offline", shiftActive: false, lastHeartbeat: now - 86400000, certifications: ["fire_safety"], currentIncidentId: null, roleType: "staff", wifiConnected: false }
    };

    await db.ref('zones').set(zones);
    await db.ref('staff').set(staff);
    console.log('✅ Live Database seeded successfully.\n');
    await sleep(2000);

    // 2. SIMULATE SENSOR WEBHOOK & AI CLASSIFICATION
    const rawSensorMessage = "Thick smoke detected and thermal spike in Kitchen Alpha near fryers.";
    console.log(`🤖 [2/5] AI Vision Sensor Triggered: "${rawSensorMessage}"`);
    console.log('⏳ Passing raw data to Gemini 1.5 Pro for classification...');
    
    const classification = await classifyIncident(rawSensorMessage, 'zone_kitchen');
    console.log(`✅ Gemini Classification:`);
    console.log(`   Severity: ${classification.severity.toUpperCase()}`);
    console.log(`   Category: ${classification.category}`);
    console.log(`   Confidence: ${classification.confidence}%`);
    console.log(`   Action: ${classification.suggestedAction}\n`);
    await sleep(2000);

    // 3. SMART ROUTING ENGINE
    console.log(`🧭 [3/5] Triggering Smart Routing Engine...`);
    const routing = await calculateRouting('zone_kitchen', classification.severity as any, classification.category);
    console.log(`✅ Best Responders Selected (Factoring Zone, Role, & Live Heartbeat):`);
    routing.topResponders.forEach((id, i) => console.log(`   ${i+1}. ${staff[id as keyof typeof staff].name} (${id})`));
    await sleep(2000);

    // 4. CREATE INCIDENT
    console.log(`\n🚨 [4/5] Creating Incident in Live Database...`);
    const incidentId = `INC-${Date.now()}`;
    const incident: Incident = {
      id: incidentId,
      title: `${classification.category.toUpperCase()} - AI Sensor Alert`,
      description: rawSensorMessage,
      zoneId: 'zone_kitchen',
      severity: classification.severity as any,
      status: 'pending',
      createdBy: 'sensor_system',
      standbyResponders: routing.topResponders,
      createdAt: Date.now(),
      aiConfidence: classification.confidence,
      aiClassification: classification.category
    };

    await db.ref(`incidents/${incidentId}`).set(incident);
    console.log(`✅ Incident ${incidentId} created! Push notifications dispatched to standby responders.\n`);
    await sleep(3000);

    // 5. STAFF ACCEPTS INCIDENT
    console.log(`📲 [5/5] Staff Member "Marcus Chen" clicks [RESPOND] on Mobile App...`);
    await db.ref(`incidents/${incidentId}`).update({
      status: 'assigned',
      assignedTo: 'staff_marcus',
      assignedAt: Date.now()
    });
    await db.ref(`staff/staff_marcus`).update({
      status: 'limited',
      currentIncidentId: incidentId
    });
    console.log(`✅ Incident locked. Marcus Chen is now the Primary Responder.`);
    console.log(`   Other responders (Alex, Jordan) notified to stand down or assist via chat.`);

    console.log('\n🎉 GOLDEN PATH DEMO COMPLETE! Everything is synced to your real Firebase project.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Demo Failed:', error);
    process.exit(1);
  }
};

runGoldenPath();
