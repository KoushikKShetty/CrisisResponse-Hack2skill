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
