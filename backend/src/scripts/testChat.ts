import { io, Socket } from 'socket.io-client';

const runTest = async () => {
  console.log('🧪 TESTING REAL-TIME WEBSOCKET CHAT (DAY 5)\n');

  const PORT = process.env.PORT || 3000;
  const SERVER_URL = `http://localhost:${PORT}/chat`;
  const INCIDENT_ID = 'INC-12345';

  // Client 1: Marcus
  const marcus: Socket = io(SERVER_URL, {
    auth: { token: 'mock_staff_marcus' }
  });

  // Client 2: Alex
  const alex: Socket = io(SERVER_URL, {
    auth: { token: 'mock_staff_alex' }
  });

  marcus.on('connect', () => {
    console.log(`[Marcus] Connected with ID: ${marcus.id}`);
    marcus.emit('join-incident', INCIDENT_ID);
  });

  alex.on('connect', () => {
    console.log(`[Alex] Connected with ID: ${alex.id}`);
    alex.emit('join-incident', INCIDENT_ID);
  });

  marcus.on('new-message', (msg) => {
    console.log(`\n💬 [Marcus received in ${INCIDENT_ID}] From ${msg.userId}: ${msg.text} (Type: ${msg.type})`);
  });

  alex.on('new-message', (msg) => {
    console.log(`\n💬 [Alex received in ${INCIDENT_ID}] From ${msg.userId}: ${msg.text} (Type: ${msg.type})`);
  });

  // Simulated Chat Flow
  setTimeout(() => {
    console.log('\n--- Initiating Chat Sequence ---');
    marcus.emit('send-message', {
      incidentId: INCIDENT_ID,
      text: 'Water shut-off valve is stuck. I need a second pair of hands at the South riser immediately.',
      type: 'message'
    });
  }, 1000);

  setTimeout(() => {
    alex.emit('send-message', {
      incidentId: INCIDENT_ID,
      text: '@Marcus On my way with the heavy wrench set. ETA 2 mins.',
      type: 'message'
    });
  }, 2000);

  setTimeout(() => {
    alex.emit('send-message', {
      incidentId: INCIDENT_ID,
      text: 'ESCALATION TRIGGERED: The leak is spreading to the main lobby.',
      type: 'escalation'
    });
  }, 3000);

  setTimeout(() => {
    console.log('\n✅ Test complete. Disconnecting clients.');
    marcus.disconnect();
    alex.disconnect();
    process.exit(0);
  }, 4000);
};

runTest();
