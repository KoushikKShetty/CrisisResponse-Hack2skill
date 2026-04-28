/// Gemma Service — Hugging Face Inference API (Gemma 4)
/// Used for specialized crisis protocol generation and RAG-enhanced responses.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

String _hfToken = '';
bool _initialized = false;

// ── Hotel Safety Knowledge Base (RAG Documents) ───────────────────
// These act as the retrieval corpus for Retrieval-Augmented Generation.
const _ragKnowledgeBase = [
  {
    'id': 'fire_protocol',
    'tags': ['fire', 'smoke', 'flames', 'burn', 'blaze'],
    'title': 'Fire Emergency Protocol',
    'content': '''
FIRE EMERGENCY PROTOCOL — Grand Thalassa Standard Operating Procedure
1. IMMEDIATE: Activate nearest fire alarm pull station. Call emergency services (101).
2. EVACUATE: Use designated fire exit routes. Never use elevators.
3. CONTAIN: Close all doors to slow fire spread. Do NOT lock.
4. ACCOUNT: Take guest registry to muster point. Account for all guests.
5. LIAISE: Designate staff member to meet fire department at main entrance.
6. KITCHEN: Activate suppression hood. Shut off gas supply at main valve.
Key contacts: Fire Control Room ext. 100, Security Desk ext. 101.
Assembly point: Main car park, Gate B.
''',
  },
  {
    'id': 'medical_protocol',
    'tags': ['medical', 'heart', 'faint', 'unconscious', 'injury', 'fall', 'collapse', 'breathing'],
    'title': 'Medical Emergency Protocol',
    'content': '''
MEDICAL EMERGENCY PROTOCOL — Grand Thalassa Standard Operating Procedure
1. ASSESS: Check consciousness, breathing, pulse. Call 108 (Ambulance).
2. AED: Nearest AED units at Lobby, Pool, Gym. Any trained staff may use.
3. CPR: Begin if trained. Dispatch qualified staff immediately.
4. DO NOT MOVE: Unless in immediate danger. Stabilize and wait.
5. PRIVACY: Clear area of bystanders. Assign one staff to escort family.
6. DOCUMENT: Note time of incident, actions taken, witness names.
Trained First Aiders on duty: Check staff roster (ext. 100).
''',
  },
  {
    'id': 'security_protocol',
    'tags': ['fight', 'threat', 'weapon', 'intruder', 'theft', 'violence', 'suspicious', 'bomb'],
    'title': 'Security Threat Protocol',
    'content': '''
SECURITY THREAT PROTOCOL — Grand Thalassa Standard Operating Procedure
1. DO NOT CONFRONT: Alert security (ext. 101) immediately.
2. LOCKDOWN: If active threat, announce Code Black. Lock all public entrances.
3. SHELTER: Guide guests to nearest interior room. Lock and barricade doors.
4. POLICE: Call 100 immediately. Provide location, description of threat.
5. COMMUNICATE: Use staff radio channel 3. Maintain radio silence on open channels.
6. EVACUATE ONLY: When police give all-clear signal.
Suspicious items: Do NOT touch. Establish 100m cordon. Call bomb disposal.
''',
  },
  {
    'id': 'flood_protocol',
    'tags': ['flood', 'water', 'rain', 'storm', 'leak', 'pipe', 'overflow'],
    'title': 'Flood / Water Emergency Protocol',
    'content': '''
FLOOD & WATER EMERGENCY PROTOCOL — Grand Thalassa Standard Operating Procedure
1. INTERNAL LEAK: Shut off water at nearest isolation valve. Call Maintenance (ext. 102).
2. EXTERNAL FLOOD: Monitor NDRF alerts. Pre-position sandbags at basement entrances.
3. ELECTRICAL RISK: Do NOT enter flooded areas. Isolate electrical supply for affected zones.
4. GUEST RELOCATION: Move ground floor guests to upper floors if rising water.
5. VALUABLES: Secure hotel documents, server room, and cash office.
6. RECORD: Document all damage with photos for insurance purposes.
Critical zones: Basement car park, Kitchen, Server Room. Check every 30 minutes.
''',
  },
  {
    'id': 'earthquake_protocol',
    'tags': ['earthquake', 'tremor', 'shake', 'collapse', 'structural'],
    'title': 'Earthquake Protocol',
    'content': '''
EARTHQUAKE PROTOCOL — Grand Thalassa Standard Operating Procedure
DURING: Drop, Cover, Hold On. Move away from windows and exterior walls.
KITCHEN STAFF: Turn off all gas appliances immediately.
POOL AREA: Move guests away from pool edges.
ELEVATORS: If occupied, evacuate at nearest floor immediately.
AFTER SHAKING STOPS:
1. Check for injuries. Do NOT move seriously injured guests.
2. Inspect for gas leaks (smell), structural damage (cracks), fire.
3. Evacuate if building appears damaged. Do not use elevators.
4. Activate business continuity plan if major damage sustained.
5. Account for all guests and staff at designated muster points.
Do NOT re-enter until structural engineer certifies building safe.
''',
  },
  {
    'id': 'power_protocol',
    'tags': ['power', 'electricity', 'blackout', 'outage', 'generator', 'lights'],
    'title': 'Power Failure Protocol',
    'content': '''
POWER FAILURE PROTOCOL — Grand Thalassa Standard Operating Procedure
1. IMMEDIATE: Emergency lighting activates automatically (30-min battery backup).
2. GENERATOR: Backup generator starts in 15 seconds. Critical systems on UPS.
3. ELEVATORS: Check all elevators for trapped guests. Use intercom to communicate.
4. GUESTS: Provide torch/flashlight. Announce via PA (battery-powered backup).
5. KITCHEN: Cease cooking operations. Refrigeration on backup circuit.
6. SECURITY: Increase manual patrols. Access control reverts to mechanical keys.
Contact maintenance (ext. 102) and power utility for estimated restoration time.
Backup PA password: CRISIS-PA-2025.
''',
  },
];

void initGemma() {
  _hfToken = env('HF_TOKEN', '');
  if (_hfToken.isEmpty) {
    print('⚠️  HF_TOKEN not set — Gemma 4 RAG unavailable');
    return;
  }
  _initialized = true;
  print('🤖 Gemma 4 (HuggingFace) initialized — RAG knowledge base loaded (${_ragKnowledgeBase.length} protocols)');
}

// ── RAG: Retrieve relevant protocol documents ──────────────────────
List<Map<String, dynamic>> retrieveRelevantDocs(String query) {
  final lower = query.toLowerCase();
  final scored = <Map<String, dynamic>>[];

  for (final doc in _ragKnowledgeBase) {
    final tags = doc['tags'] as List;
    int score = 0;
    for (final tag in tags) {
      if (lower.contains(tag as String)) score += 3;
    }
    // Also match on title words
    final titleWords = (doc['title'] as String).toLowerCase().split(' ');
    for (final w in titleWords) {
      if (lower.contains(w) && w.length > 3) score += 1;
    }
    if (score > 0) scored.add({...doc, 'score': score});
  }

  scored.sort((a, b) => (b['score'] as int).compareTo(a['score'] as int));
  return scored.take(2).toList(); // Top 2 most relevant
}

// ── Generate crisis response using Gemma 4 + RAG ─────────────────
Future<String> generateCrisisProtocol(String incidentDescription, String zone) async {
  if (!_initialized) {
    return _fallbackProtocol(incidentDescription);
  }

  // Step 1: Retrieve relevant docs (RAG)
  final docs = retrieveRelevantDocs(incidentDescription);
  final ragContext = docs.isEmpty
      ? 'No specific protocol matched. Apply general emergency procedures.'
      : docs.map((d) => '=== ${d['title']} ===\n${d['content']}').join('\n\n');

  // Step 2: Build prompt with RAG context
  final prompt = '''<start_of_turn>user
You are CrisisSync AI — an expert hotel emergency response coordinator.

INCIDENT REPORTED: $incidentDescription
LOCATION: $zone

RELEVANT HOTEL PROTOCOLS (use these as authoritative reference):
$ragContext

Generate a concise, actionable response protocol for the on-duty staff. Format:
1. IMMEDIATE ACTIONS (first 60 seconds)
2. COMMUNICATION STEPS (who to notify)
3. GUEST SAFETY ACTIONS
4. FOLLOW-UP (next 15 minutes)

Keep response under 200 words. Be direct and specific to the $zone location.
<end_of_turn>
<start_of_turn>model
''';

  try {
    // Try Gemma 4 via HuggingFace Inference API
    final res = await http.post(
      Uri.parse('https://api-inference.huggingface.co/models/google/gemma-4-9b-it'),
      headers: {
        'Authorization': 'Bearer $_hfToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'inputs': prompt,
        'parameters': {
          'max_new_tokens': 300,
          'temperature': 0.3,
          'do_sample': false,
          'return_full_text': false,
        },
      }),
    ).timeout(const Duration(seconds: 30));

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      String output = '';
      if (data is List && data.isNotEmpty) {
        output = data[0]['generated_text'] as String? ?? '';
      } else if (data is Map) {
        output = data['generated_text'] as String? ?? '';
      }
      if (output.trim().isNotEmpty) {
        print('[Gemma4] Protocol generated via HuggingFace RAG');
        return output.trim();
      }
    }

    // Fallback to smaller gemma model
    final res2 = await http.post(
      Uri.parse('https://api-inference.huggingface.co/models/google/gemma-2-2b-it'),
      headers: {
        'Authorization': 'Bearer $_hfToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'inputs': prompt,
        'parameters': {'max_new_tokens': 250, 'temperature': 0.3, 'return_full_text': false},
      }),
    ).timeout(const Duration(seconds: 25));

    if (res2.statusCode == 200) {
      final data = jsonDecode(res2.body);
      if (data is List && data.isNotEmpty) {
        final output = data[0]['generated_text'] as String? ?? '';
        if (output.trim().isNotEmpty) {
          print('[Gemma2] Protocol generated via HuggingFace RAG (fallback model)');
          return output.trim();
        }
      }
    }

    print('[Gemma] HuggingFace failed (${res.statusCode}) — using RAG-only protocol');
    return _ragBasedProtocol(incidentDescription, zone, docs);
  } catch (e) {
    print('[Gemma] Error: $e — using RAG-only protocol');
    return _ragBasedProtocol(incidentDescription, zone, docs);
  }
}

// ── RAG-only response (no model needed) ───────────────────────────
String _ragBasedProtocol(String incident, String zone, List<Map<String, dynamic>> docs) {
  if (docs.isEmpty) return _fallbackProtocol(incident);

  final top = docs.first;
  final content = top['content'] as String;
  // Return first 400 chars of the matched protocol, cleaned up
  final lines = content.trim().split('\n')
      .where((l) => l.trim().isNotEmpty)
      .take(8)
      .join('\n');
  return '📋 ${top['title']} — $zone\n\n$lines';
}

String _fallbackProtocol(String incident) {
  return '''📋 General Emergency Protocol — $incident

1. IMMEDIATE: Alert security desk (ext. 101) and call emergency services.
2. COMMUNICATE: Notify all on-duty staff via radio channel 3.
3. GUESTS: Guide guests away from the incident area to safety.
4. DOCUMENT: Note time, location, and nature of incident.
5. AWAIT: Emergency services — designate staff to direct responders on arrival.

Stay calm. Follow your training. Guest safety is the priority.''';
}

// ── Public: Get RAG context for a query (used by other services) ──
String getRagContext(String query) {
  final docs = retrieveRelevantDocs(query);
  if (docs.isEmpty) return '';
  return docs.map((d) => '${d['title']}: ${(d['content'] as String).trim().split('\n').take(3).join(' ')}').join('\n');
}
