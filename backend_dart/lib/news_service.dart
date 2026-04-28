/// News Service — polls GNews API for crisis-related headlines,
/// classifies them with Gemini, and broadcasts via WebSocket.
library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'gemini_service.dart';
import 'websocket_service.dart';

Timer? _newsTimer;

// ── Crisis keywords for pre-filter ──────────────────────────────────
const _keywords = [
  'fire', 'explosion', 'earthquake', 'flood', 'tsunami', 'hurricane',
  'tornado', 'shooting', 'terror', 'attack', 'bomb', 'evacuate',
  'emergency', 'disaster', 'crisis', 'accident', 'collapse',
  'chemical', 'hazmat', 'outbreak', 'pandemic', 'quarantine',
];

// ── In-memory cache to avoid re-broadcasting same story ─────────────
final _seenUrls = <String>{};
Map<String, dynamic>? _lastBroadcast;

void startNewsListener() {
  final apiKey = env('GNEWS_API_KEY', '');
  if (apiKey.isEmpty) {
    print('⚠️  GNEWS_API_KEY not set — using simulated news briefings');
    _startSimulatedNews();
    return;
  }
  print('📰 News Listener started — polling every 5 minutes');
  _pollNews(apiKey);
  _newsTimer = Timer.periodic(const Duration(minutes: 5), (_) => _pollNews(apiKey));
}

void stopNewsListener() {
  _newsTimer?.cancel();
}

Future<void> _pollNews(String apiKey) async {
  try {
    final query = Uri.encodeComponent(
        'emergency OR crisis OR disaster OR fire OR earthquake OR flood');
    final url = Uri.parse(
        'https://gnews.io/api/v4/search?q=$query&lang=en&max=5&token=$apiKey');

    final res = await http.get(url).timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) {
      print('[News] GNews API error: ${res.statusCode}');
      return;
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final articles = (data['articles'] as List<dynamic>?) ?? [];

    for (final raw in articles) {
      final article = raw as Map<String, dynamic>;
      final url = article['url'] as String? ?? '';
      if (_seenUrls.contains(url)) continue;
      _seenUrls.add(url);

      final title = article['title'] as String? ?? '';
      final description = article['description'] as String? ?? '';
      final source = (article['source'] as Map?)?.values.first ?? 'Unknown';

      // Pre-filter: skip if not crisis-related
      final combined = '$title $description'.toLowerCase();
      final isCrisis = _keywords.any((k) => combined.contains(k));
      if (!isCrisis) continue;

      // Classify with Gemini
      final classification = await _classifyNews(title, description);
      if (classification == 'IRRELEVANT') continue;

      final payload = {
        'type': 'news_update',
        'title': title,
        'description': description,
        'source': source.toString(),
        'url': url,
        'classification': classification,
        'publishedAt': article['publishedAt'] ?? DateTime.now().toIso8601String(),
      };

      _lastBroadcast = payload;
      broadcast('news_update', payload);
      print('[News] Broadcast: [$classification] $title');
      break; // Send one at a time, most recent first
    }
  } catch (e) {
    print('[News] Poll error: $e');
  }
}

Future<String> _classifyNews(String title, String description) async {
  final prompt = '''
You are a hotel crisis response coordinator. Classify this news headline:

Title: $title
Description: $description

Respond with EXACTLY one of:
- EMERGENCY  (active crisis that may directly affect hotel operations: fire, explosion, terror, earthquake near property)
- WARNING    (nearby incident that hotel staff should monitor: flood warning, civil unrest, major accident)
- BRIEFING   (general crisis awareness: disaster elsewhere, safety statistics, preparedness news)
- IRRELEVANT (not crisis-related)

Response (one word only):''';

  final result = await generateText(prompt);
  final clean = result.trim().toUpperCase();
  for (final c in ['EMERGENCY', 'WARNING', 'BRIEFING', 'IRRELEVANT']) {
    if (clean.contains(c)) return c;
  }
  return 'BRIEFING';
}

// ── Simulated news when no API key is set ─────────────────────────
void _startSimulatedNews() {
  final briefings = [
    {
      'title': 'Local fire department conducts emergency response drill',
      'description': 'Annual evacuation procedures tested across hospitality venues in the city.',
      'source': 'City Emergency Services',
      'classification': 'BRIEFING',
    },
    {
      'title': 'Flash flood warning issued for coastal areas',
      'description': 'Authorities urge hotels and resorts to prepare emergency protocols.',
      'source': 'Meteorological Department',
      'classification': 'WARNING',
    },
    {
      'title': 'WHO issues guidance on heat emergency response for public venues',
      'description': 'Hotels advised to designate cooling centers and monitor vulnerable guests.',
      'source': 'WHO',
      'classification': 'BRIEFING',
    },
    {
      'title': 'Major power grid failure reported — backup power systems recommended',
      'description': 'Extended outage affecting city districts. Generator testing advised.',
      'source': 'Power Authority',
      'classification': 'WARNING',
    },
    {
      'title': '🚨 Gas leak reported near city center — evacuations underway',
      'description': 'Emergency services responding. Hotels in radius advised to shelter in place.',
      'source': 'Emergency Services',
      'classification': 'EMERGENCY',
    },
  ];

  var idx = 0;
  // Send first one after 10 seconds
  Timer(const Duration(seconds: 10), () {
    _broadcastSimulated(briefings[idx % briefings.length]);
    idx++;
    // Then every 8 minutes cycle through
    _newsTimer = Timer.periodic(const Duration(minutes: 8), (_) {
      _broadcastSimulated(briefings[idx % briefings.length]);
      idx++;
    });
  });
}

void _broadcastSimulated(Map<String, dynamic> item) {
  final payload = {
    'type': 'news_update',
    'title': item['title'],
    'description': item['description'],
    'source': item['source'],
    'url': '',
    'classification': item['classification'],
    'publishedAt': DateTime.now().toIso8601String(),
    'simulated': true,
  };
  _lastBroadcast = payload;
  broadcast('news_update', payload);
  print('[News] Simulated: [${item['classification']}] ${item['title']}');
}

Map<String, dynamic>? getLatestNews() => _lastBroadcast;
