import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  bool _isOnline = true;
  bool _hasActiveIncident = true;

  String _incidentTitle = 'Smoke Detected — Kitchen Alpha';
  String _incidentZone = 'Kitchen Alpha • Sector B2';
  String _incidentDesc =
      'Elevated particulate levels detected by sensor SMK-402. Automated ventilation triggered. Awaiting visual confirmation from nearest responder.';
  String _incidentSeverity = 'CRITICAL';
  List<dynamic> _actionPlan = [];
  Map<String, dynamic>? _latestNews;

  // Escalation state
  String _escalationLevel = ''; // 'zone_only' | 'all_staff' | 'first_responders'
  int _confidencePct = 0;
  List<dynamic> _respondersDispatched = [];
  String _responderEta = '';
  bool _firstRespondersAlerted = false;

  late AnimationController _pulseController;
  late IO.Socket socket;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _initSocket();
  }

  void _initSocket() {
    socket = IO.io('http://localhost:3000/chat', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {'token': 'mock_123'},
    });
    socket.connect();
    socket.onConnect((_) => debugPrint('Socket connected'));
    socket.on('hardware_alert', (data) {
      if (!mounted) return;
      setState(() {
        _hasActiveIncident = true;
        _incidentTitle = data['title'] ?? 'HARDWARE ALERT';
        _incidentZone = data['zone'] ?? 'Unknown Zone';
        _incidentDesc = data['description'] ?? 'Automated hardware trigger.';
        _incidentSeverity = data['severity'] == 'warning' ? 'WARNING' : 'CRITICAL';
        _confidencePct = data['confidence'] ?? 0;
        _escalationLevel = 'all_staff';
        _firstRespondersAlerted = false;
        if (data['actionPlan'] != null) _actionPlan = data['actionPlan'];
      });
    });

    // Zone-only BLE alert (low confidence — nearby staff only)
    socket.on('zone_alert', (data) {
      if (!mounted) return;
      setState(() {
        _hasActiveIncident = true;
        _incidentTitle = data['zone'] != null ? '⚡ Zone Alert — ${data['zone']}' : 'ZONE ALERT';
        _incidentZone = data['zone'] ?? 'Unknown Zone';
        _incidentDesc = data['description'] ?? 'Sensor trigger in your BLE zone.';
        _incidentSeverity = 'WARNING';
        _confidencePct = ((data['confidence'] ?? 0.4) * 100).round();
        _escalationLevel = 'zone_only';
        _firstRespondersAlerted = false;
        if (data['actionPlan'] != null) _actionPlan = data['actionPlan'];
      });
    });

    // First responders dispatched (high confidence)
    socket.on('responders_dispatched', (data) {
      if (!mounted) return;
      setState(() {
        _firstRespondersAlerted = true;
        _escalationLevel = 'first_responders';
        _respondersDispatched = data['responderTypes'] ?? [];
        _responderEta = data['eta'] ?? '';
      });
    });

    socket.on('news_update', (data) {
      if (!mounted) return;
      setState(() => _latestNews = data);
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    socket.disconnect();
    socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Live Status Bar
              _buildStatusBar(),
              // News Banner
              if (_latestNews != null) _buildNewsBanner(),
              Padding(
                padding: const EdgeInsets.all(AppTheme.spacingMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    const Text('Command Center',
                        style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.5)),
                    const SizedBox(height: 4),
                    Text('Rapid Crisis Response • ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(
                            fontSize: 14, color: AppTheme.textSecondary)),
                    const SizedBox(height: 20),
                    // Stats Row
                    _buildStatsRow(),
                    const SizedBox(height: 16),
                    // Escalation level badge
                    if (_escalationLevel.isNotEmpty) _buildEscalationBadge(),
                    if (_escalationLevel.isNotEmpty) const SizedBox(height: 12),
                    // First responders banner
                    if (_firstRespondersAlerted) _buildRespondersBanner(),
                    if (_firstRespondersAlerted) const SizedBox(height: 12),
                    // Active Incident
                    if (_hasActiveIncident) _buildIncidentCard(),
                    const SizedBox(height: 16),
                    // AI Status
                    _buildAiCard(),
                    const SizedBox(height: 16),
                    // Quick Actions
                    _buildQuickActions(),
                  ],

                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      decoration: BoxDecoration(
        color: _isOnline
            ? AppTheme.successGreen.withOpacity(0.1)
            : AppTheme.warningAmber.withOpacity(0.1),
        border: Border(
          bottom: BorderSide(
              color: _isOnline
                  ? AppTheme.successGreen.withOpacity(0.3)
                  : AppTheme.warningAmber.withOpacity(0.3),
              width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, __) => Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _isOnline ? AppTheme.successGreen : AppTheme.warningAmber,
                boxShadow: [
                  BoxShadow(
                    color: (_isOnline ? AppTheme.successGreen : AppTheme.warningAmber)
                        .withOpacity(_pulseController.value * 0.6),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            _isOnline ? 'SYSTEM LIVE • ALL SENSORS ONLINE' : 'LIMITED CONNECTIVITY',
            style: TextStyle(
              color: _isOnline ? AppTheme.successGreen : AppTheme.warningAmber,
              fontWeight: FontWeight.bold,
              fontSize: 11,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStatCard('Active\nIncidents', '3', AppTheme.criticalRed),
        const SizedBox(width: 10),
        _buildStatCard('Responders\nOnline', '14', AppTheme.successGreen),
        const SizedBox(width: 10),
        _buildStatCard('Zones\nMonitored', '42', AppTheme.accentCyan),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: color)),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textMuted,
                    height: 1.3)),
          ],
        ),
      ),
    );
  }

  Widget _buildNewsBanner() {
    final isEmergency = _latestNews?['classification'] == 'EMERGENCY';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isEmergency
            ? AppTheme.criticalRed.withOpacity(0.15)
            : AppTheme.accentCyan.withOpacity(0.1),
        border: Border(
          bottom: BorderSide(
            color: isEmergency
                ? AppTheme.criticalRed.withOpacity(0.3)
                : AppTheme.accentCyan.withOpacity(0.3),
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isEmergency ? LucideIcons.alertTriangle : LucideIcons.radio,
            color: isEmergency ? AppTheme.criticalRed : AppTheme.accentCyan,
            size: 18,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isEmergency ? 'EMERGENCY INTEL' : 'DAILY BRIEFING',
                  style: TextStyle(
                    color: isEmergency ? AppTheme.criticalRed : AppTheme.accentCyan,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _latestNews?['title'] ?? '',
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentCard() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacingMd),
      decoration: BoxDecoration(
        gradient: AppTheme.criticalGradient,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: AppTheme.criticalRed.withOpacity(0.4)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.criticalRed.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.criticalRed,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.criticalRed
                              .withOpacity(_pulseController.value * 0.8),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(_incidentSeverity,
                    style: const TextStyle(
                        color: AppTheme.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        letterSpacing: 2)),
              ]),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                ),
                child: const Text('LIVE',
                    style: TextStyle(
                        color: AppTheme.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                        letterSpacing: 1.5)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(_incidentTitle,
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.white)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.mapPin,
                  color: AppTheme.warningAmber, size: 12),
              const SizedBox(width: 6),
              Text(_incidentZone,
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.white)),
            ]),
          ),
          const SizedBox(height: 12),
          Text(_incidentDesc,
              style: TextStyle(
                  fontSize: 13,
                  color: AppTheme.white.withOpacity(0.85),
                  height: 1.5)),
          if (_actionPlan.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.white.withOpacity(0.08),
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                border: Border.all(color: AppTheme.white.withOpacity(0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: const [
                    Icon(LucideIcons.sparkles, color: AppTheme.accentCyan, size: 14),
                    SizedBox(width: 6),
                    Text('GEMMA AI PROTOCOL',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.accentCyan,
                            fontSize: 11,
                            letterSpacing: 1)),
                  ]),
                  const SizedBox(height: 8),
                  ..._actionPlan.asMap().entries.map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('${e.key + 1}. ${e.value}',
                            style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.white.withOpacity(0.9))),
                      )),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusButton)),
                  elevation: 0,
                ),
                child: const Text('RESPOND NOW',
                    style: TextStyle(
                        color: Color(0xFF991B1B),
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        letterSpacing: 1)),
              ),
            ),
            const SizedBox(width: 10),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(AppTheme.radiusButton),
              ),
              child: IconButton(
                onPressed: () {},
                icon: const Icon(LucideIcons.x, color: AppTheme.white, size: 20),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildAiCard() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacingMd),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: AppTheme.accentCyan.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppTheme.accentCyanBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(LucideIcons.brain, color: AppTheme.accentCyan, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Gemma AI • Active',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.accentCyan)),
                const SizedBox(height: 2),
                Text('Monitoring all zones. Threat level: LOW',
                    style: TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary)),
              ],
            ),
          ),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.successGreen,
              boxShadow: [
                BoxShadow(
                    color: AppTheme.successGreen.withOpacity(0.5),
                    blurRadius: 6),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('RAPID ACTIONS',
            style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 2)),
        const SizedBox(height: 12),
        Row(children: [
          _buildActionTile(LucideIcons.radio, 'Broadcast', AppTheme.accentCyan),
          const SizedBox(width: 10),
          _buildActionTile(LucideIcons.users, 'Deploy Team', AppTheme.successGreen),
          const SizedBox(width: 10),
          _buildActionTile(LucideIcons.fileText, 'Reports', AppTheme.warningAmber),
        ]),
      ],
    );
  }

  Widget _buildActionTile(IconData icon, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(color: AppTheme.borderDefault),
        ),
        child: Column(children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(label,
              style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  // ── Escalation Level Badge ─────────────────────────────────────
  Widget _buildEscalationBadge() {
    Color color;
    String label;
    IconData icon;

    switch (_escalationLevel) {
      case 'first_responders':
        color = AppTheme.criticalRed;
        label = 'FIRST RESPONDERS CONTACTED';
        icon = LucideIcons.siren;
        break;
      case 'all_staff':
        color = AppTheme.warningAmber;
        label = 'ALL STAFF ALERTED';
        icon = LucideIcons.users;
        break;
      default:
        color = AppTheme.accentCyan;
        label = 'NEARBY BLE STAFF NOTIFIED';
        icon = LucideIcons.bluetooth;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    letterSpacing: 1.2)),
            if (_confidencePct > 0)
              Text('AI Confidence: $_confidencePct%',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11)),
          ]),
        ),
      ]),
    );
  }

  // ── First Responders Dispatched Banner ─────────────────────────
  Widget _buildRespondersBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: AppTheme.criticalGradient,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: AppTheme.criticalRed.withOpacity(0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(LucideIcons.alertOctagon,
              color: AppTheme.white, size: 18),
          const SizedBox(width: 8),
          const Text('EMERGENCY SERVICES DISPATCHED',
              style: TextStyle(
                  color: AppTheme.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  letterSpacing: 1.5)),
          const Spacer(),
          if (_responderEta.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppTheme.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(AppTheme.radiusPill),
              ),
              child: Text('ETA $_responderEta',
                  style: const TextStyle(
                      color: AppTheme.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 11)),
            ),
        ]),
        if (_respondersDispatched.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: _respondersDispatched.map<Widget>((r) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(AppTheme.radiusPill),
              ),
              child: Text(r.toString(),
                  style: const TextStyle(
                      color: AppTheme.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600)),
            )).toList(),
          ),
        ],
      ]),
    );
  }
}

