import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, dynamic>> _messages = [
    {
      'sender': 'SYSTEM',
      'message': 'Incident channel opened — Smoke Detected, Kitchen Alpha',
      'time': '10:41 AM',
      'type': 'system',
    },
    {
      'sender': 'Marcus Chen',
      'avatar': 'MC',
      'message': 'Visual confirmed. Light smoke from ventilation duct near stove 3. No visible flame. Activating suppression protocol.',
      'time': '10:42 AM',
      'type': 'other',
    },
    {
      'sender': 'Gemma AI',
      'avatar': '✦',
      'message': 'Analysis: Particulate levels at 340 PPM (threshold: 200). Pattern consistent with grease fire precursor. Recommend immediate kitchen evacuation and suppression activation.',
      'time': '10:42 AM',
      'type': 'ai',
    },
    {
      'sender': 'You',
      'avatar': 'AR',
      'message': 'Copy that. Security team deploying to cordon Kitchen Alpha. Marcus — confirm when suppression is active.',
      'time': '10:43 AM',
      'type': 'me',
    },
    {
      'sender': 'SYSTEM',
      'message': '2 additional responders joined the channel',
      'time': '10:44 AM',
      'type': 'system',
    },
    {
      'sender': 'Sarah Miller',
      'avatar': 'SM',
      'message': 'Medical team on standby at the east corridor. No injuries reported yet.',
      'time': '10:45 AM',
      'type': 'other',
    },
  ];

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: Column(
          children: [
            // Incident Header
            _buildHeader(),
            // Messages
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (_, i) => _buildMessage(_messages[i]),
              ),
            ),
            // Escalate Bar
            _buildEscalateBar(),
            // Input Area
            _buildInputArea(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.criticalRedBg,
        border: Border(
          bottom: BorderSide(color: AppTheme.criticalRed.withOpacity(0.3)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.criticalRed,
              boxShadow: [
                BoxShadow(
                    color: AppTheme.criticalRed.withOpacity(0.5),
                    blurRadius: 6),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('ACTIVE INCIDENT CHANNEL',
                    style: TextStyle(
                        color: AppTheme.criticalRed,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        letterSpacing: 1.5)),
                SizedBox(height: 2),
                Text('Kitchen Alpha — Smoke Detection',
                    style: TextStyle(
                        color: AppTheme.textPrimary, fontSize: 14)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.successGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: const [
              Icon(LucideIcons.users, color: AppTheme.successGreen, size: 12),
              SizedBox(width: 4),
              Text('6 online',
                  style: TextStyle(
                      color: AppTheme.successGreen,
                      fontSize: 11,
                      fontWeight: FontWeight.bold)),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(Map<String, dynamic> msg) {
    switch (msg['type']) {
      case 'system':
        return _buildSystemMsg(msg);
      case 'ai':
        return _buildAiMsg(msg);
      case 'me':
        return _buildUserMsg(msg, isMe: true);
      default:
        return _buildUserMsg(msg, isMe: false);
    }
  }

  Widget _buildSystemMsg(Map<String, dynamic> msg) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(AppTheme.radiusPill),
            border: Border.all(color: AppTheme.borderDefault),
          ),
          child: Text(msg['message'],
              style: const TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w500)),
        ),
      ),
    );
  }

  Widget _buildAiMsg(Map<String, dynamic> msg) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: AppTheme.cyanGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: const Text('✦',
                style: TextStyle(fontSize: 16, color: AppTheme.white)),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('Gemma AI',
                      style: TextStyle(
                          color: AppTheme.accentCyan,
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                  const SizedBox(width: 8),
                  Text(msg['time'],
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 11)),
                ]),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.accentCyanBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppTheme.accentCyan.withOpacity(0.2)),
                  ),
                  child: Text(msg['message'],
                      style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 13,
                          height: 1.5)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserMsg(Map<String, dynamic> msg, {required bool isMe}) {
    final avatarColor = isMe ? AppTheme.accentCyan : AppTheme.warningAmber;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMe) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: avatarColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: avatarColor.withOpacity(0.3)),
              ),
              alignment: Alignment.center,
              child: Text(msg['avatar'],
                  style: TextStyle(
                      color: avatarColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(msg['sender'],
                        style: TextStyle(
                            color: isMe ? AppTheme.accentCyan : AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12)),
                    const SizedBox(width: 8),
                    Text(msg['time'],
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isMe ? AppTheme.accentCyanBg : AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(12).copyWith(
                      topLeft: isMe ? null : const Radius.circular(4),
                      topRight: isMe ? const Radius.circular(4) : null,
                    ),
                    border: Border.all(
                      color: isMe
                          ? AppTheme.accentCyan.withOpacity(0.2)
                          : AppTheme.borderDefault,
                    ),
                  ),
                  child: Text(msg['message'],
                      style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 13,
                          height: 1.5)),
                ),
              ],
            ),
          ),
          if (isMe) ...[
            const SizedBox(width: 10),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.accentCyan.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.accentCyan.withOpacity(0.3)),
              ),
              alignment: Alignment.center,
              child: Text(msg['avatar'],
                  style: const TextStyle(
                      color: AppTheme.accentCyan,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEscalateBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ElevatedButton.icon(
        onPressed: () {},
        icon: const Icon(LucideIcons.alertTriangle,
            color: AppTheme.white, size: 16),
        label: const Text('ESCALATE TO SUPERVISOR',
            style: TextStyle(
                color: AppTheme.white,
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 1)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF991B1B),
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusButton)),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        border: Border(
          top: BorderSide(color: AppTheme.borderDefault),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderDefault),
            ),
            child: IconButton(
              icon: const Icon(LucideIcons.plus,
                  color: AppTheme.textMuted, size: 18),
              onPressed: () {},
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _messageController,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Type tactical message...',
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.bgCard,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  borderSide: BorderSide(color: AppTheme.borderDefault),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  borderSide: BorderSide(color: AppTheme.borderDefault),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  borderSide: const BorderSide(color: AppTheme.accentCyan),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: AppTheme.cyanGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(LucideIcons.send,
                  color: AppTheme.white, size: 18),
              onPressed: () {
                if (_messageController.text.trim().isNotEmpty) {
                  setState(() {
                    _messages.add({
                      'sender': 'You',
                      'avatar': 'AR',
                      'message': _messageController.text.trim(),
                      'time': '${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
                      'type': 'me',
                    });
                    _messageController.clear();
                  });
                  Future.delayed(const Duration(milliseconds: 100), () {
                    _scrollController.animateTo(
                      _scrollController.position.maxScrollExtent,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                    );
                  });
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
