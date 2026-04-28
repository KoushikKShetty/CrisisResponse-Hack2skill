/// CrisisSync Dart Backend — main server entry point
/// Runs on http://localhost:8080
library;

import 'dart:io';
import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_web_socket/shelf_web_socket.dart';
import 'package:shelf_cors_headers/shelf_cors_headers.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'package:backend_dart/config.dart';
import 'package:backend_dart/firebase_service.dart';
import 'package:backend_dart/gemini_service.dart';
import 'package:backend_dart/gemma_service.dart';
import 'package:backend_dart/news_service.dart';
import 'package:backend_dart/websocket_service.dart';
import 'package:backend_dart/handlers/auth_handler.dart';
import 'package:backend_dart/handlers/incidents_handler.dart';
import 'package:backend_dart/handlers/guest_handler.dart';
import 'package:backend_dart/handlers/mock_handler.dart';

void main() async {
  // ── 1. Load config ──────────────────────────────────────────────
  loadEnv();

  // ── 2. Init Firebase ────────────────────────────────────────────
  initFirebase();

  // ── 3. Init AI services ─────────────────────────────────────────
  initGemini();   // Gemini 2.5 Flash — classification + guest answers
  initGemma();    // Gemma 4 via HuggingFace — RAG crisis protocols

  // ── 4. Build router ─────────────────────────────────────────────
  final app = Router();

  // Root landing page
  app.get('/', (Request req) => Response.ok(
        '''<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CrisisSync — AI Crisis Response</title>
  <style>
    body { background: #0a0f1e; color: #e2e8f0; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #111827; border: 1px solid #1e3a5f; border-radius: 16px; padding: 40px; max-width: 560px; width: 90%; }
    h1 { color: #06b6d4; font-size: 2rem; margin: 0 0 8px; }
    .tag { background: #0e7490; color: #fff; font-size: 11px; padding: 4px 10px; border-radius: 99px; letter-spacing: 1px; font-weight: bold; }
    .status { display: flex; align-items: center; gap: 8px; margin: 24px 0 16px; }
    .dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; }
    .endpoints { background: #0a0f1e; border-radius: 10px; padding: 16px; margin-top: 20px; }
    .endpoints a { color: #06b6d4; text-decoration: none; display: block; padding: 6px 0; font-size: 13px; font-family: monospace; }
    .endpoints a:hover { color: #fff; }
    .badge { display: inline-block; background: #1e3a5f; border-radius: 6px; padding: 3px 8px; font-size: 11px; margin: 4px 2px; color: #93c5fd; }
    p { color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div><span class="tag">SOLUTION CHALLENGE 2026</span></div>
    <h1 style="margin-top:16px">CrisisSync</h1>
    <p style="margin:0 0 4px; color:#06b6d4; font-weight:600">AI-Powered Crisis Response for Hospitality</p>
    <div class="status">
      <div class="dot"></div>
      <span style="color:#22c55e; font-weight:bold; font-size:13px">SYSTEM LIVE — DART BACKEND ONLINE</span>
    </div>
    <p>Real-time hotel emergency detection, AI triage via Vertex AI (Gemini 2.5 Flash), 3-tier escalation, and first responder dispatch — all in under 2 seconds.</p>
    <div>
      <span class="badge">Vertex AI</span>
      <span class="badge">Gemini 2.5 Flash</span>
      <span class="badge">Firebase RTDB</span>
      <span class="badge">Gemma RAG</span>
      <span class="badge">WebSocket</span>
    </div>
    <div class="endpoints">
      <a href="/health">GET /health — System status</a>
      <a href="/news/latest">GET /news/latest — Live threat intel</a>
      <a href="/rag/protocol">POST /rag/protocol — AI crisis protocol</a>
    </div>
  </div>
</body>
</html>''',
        headers: {'Content-Type': 'text/html'},
      ));

  // Health check
  app.get('/health', (Request req) => Response.ok(
        jsonEncode({
          'status': 'ok',
          'timestamp': DateTime.now().toIso8601String(),
          'engine': 'Dart shelf',
          'wsClients': connectedClients,
          'ai': {
            'gemini': env('GEMINI_API_KEY').isNotEmpty ? 'active' : 'mock',
            'gemma': env('HF_TOKEN').isNotEmpty ? 'active' : 'unavailable',
            'newsListener': 'active',
            'rag': 'active',
          },
        }),
        headers: {'Content-Type': 'application/json'},
      ));

  // Sub-routers
  app.mount('/auth/', buildAuthRouter().call);
  app.mount('/incidents/', buildIncidentsRouter().call);
  app.mount('/guest/', buildGuestRouter().call);
  app.mount('/mock/', buildMockRouter().call);

  // ── News endpoints ──────────────────────────────────────────────
  // GET /news/latest — returns the most recently broadcast news item
  app.get('/news/latest', (Request req) {
    final news = getLatestNews();
    if (news == null) {
      return Response.ok(
        jsonEncode({'message': 'No news broadcast yet'}),
        headers: {'Content-Type': 'application/json'},
      );
    }
    return Response.ok(
      jsonEncode(news),
      headers: {'Content-Type': 'application/json'},
    );
  });

  // ── RAG / Gemma protocol endpoint ───────────────────────────────
  // POST /rag/protocol — generate a Gemma 4 + RAG crisis protocol
  app.post('/rag/protocol', (Request req) async {
    try {
      final body = jsonDecode(await req.readAsString()) as Map<String, dynamic>;
      final incident = body['incident'] as String? ?? '';
      final zone = body['zone'] as String? ?? 'Unknown Zone';
      if (incident.isEmpty) {
        return Response(400,
            body: jsonEncode({'error': 'incident field required'}),
            headers: {'Content-Type': 'application/json'});
      }
      // Retrieve RAG docs
      final docs = retrieveRelevantDocs(incident);
      // Generate protocol (Gemma 4 → Gemma 2 → RAG fallback)
      final protocol = await generateCrisisProtocol(incident, zone);
      return Response.ok(
        jsonEncode({
          'protocol': protocol,
          'ragDocuments': docs.map((d) => {
            'id': d['id'],
            'title': d['title'],
            'relevanceScore': d['score'],
          }).toList(),
          'model': 'gemma-4 + RAG',
        }),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return Response(500,
          body: jsonEncode({'error': e.toString()}),
          headers: {'Content-Type': 'application/json'});
    }
  });

  // ── WebSocket endpoint (ws://host:8080/ws) ──────────────────────
  final wsHandler = webSocketHandler(
    (WebSocketChannel channel, String? protocol) {
      registerClient(channel);
      print('🔌 WS client connected (total: $connectedClients)');
      // Send latest news immediately on connect so staff app shows it
      final latestNews = getLatestNews();
      if (latestNews != null) {
        try {
          channel.sink.add(jsonEncode(latestNews));
        } catch (_) {}
      }
    },
  );
  app.get('/ws', wsHandler);

  // ── 5. Add middleware ───────────────────────────────────────────
  final handler = Pipeline()
      .addMiddleware(corsHeaders())
      .addMiddleware(logRequests())
      .addHandler(app.call);

  // ── 6. Start server ─────────────────────────────────────────────
  final port = int.tryParse(Platform.environment['PORT'] ?? '8080') ?? 8080;
  final server =
      await io.serve(handler, InternetAddress.anyIPv4, port);

  print('🚀 CrisisSync Dart Backend running on http://0.0.0.0:${server.port}');
  print('   Health: http://localhost:${server.port}/health');
  print('   WebSocket: ws://localhost:${server.port}/ws');
  print('   RAG: http://localhost:${server.port}/rag/protocol');
  print('   News: http://localhost:${server.port}/news/latest');

  // ── 7. Start background services ────────────────────────────────
  startNewsListener(); // polls every 5 min, broadcasts via WebSocket
}
