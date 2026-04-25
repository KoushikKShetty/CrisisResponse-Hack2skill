import 'package:flutter/material.dart';

class AppTheme {
  // === DARK CRISIS RESPONSE PALETTE ===
  // Primary - Deep Navy / Slate
  static const Color bgPrimary = Color(0xFF0B1120);
  static const Color bgSecondary = Color(0xFF111827);
  static const Color bgCard = Color(0xFF1A2332);
  static const Color bgCardHover = Color(0xFF1F2B3D);
  static const Color bgSurface = Color(0xFF243044);

  // Accent - Electric Cyan (command & control)
  static const Color accentCyan = Color(0xFF22D3EE);
  static const Color accentCyanDim = Color(0xFF0E7490);
  static const Color accentCyanBg = Color(0xFF0C2D3E);

  // Alert Colors
  static const Color criticalRed = Color(0xFFEF4444);
  static const Color criticalRedBg = Color(0xFF3B1111);
  static const Color warningAmber = Color(0xFFFBBF24);
  static const Color warningAmberBg = Color(0xFF3B2E0A);
  static const Color successGreen = Color(0xFF22C55E);
  static const Color successGreenBg = Color(0xFF0A3B1E);
  static const Color infoBlue = Color(0xFF3B82F6);

  // SOS - Pulsing Red-Orange
  static const Color sosRed = Color(0xFFFF3B3B);

  // Text
  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Borders
  static const Color borderDefault = Color(0xFF2A3548);
  static const Color borderActive = Color(0xFF22D3EE);

  // Utility
  static const Color white = Color(0xFFFFFFFF);
  static const Color transparent = Colors.transparent;

  // === SPACING ===
  static const double spacingXs = 4.0;
  static const double spacingSm = 8.0;
  static const double spacingMd = 16.0;
  static const double spacingLg = 24.0;
  static const double spacingXl = 32.0;

  // === RADII ===
  static const double radiusCard = 16.0;
  static const double radiusPill = 9999.0;
  static const double radiusButton = 12.0;
  static const double radiusSm = 8.0;

  // === GRADIENTS ===
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A2332), Color(0xFF111827)],
  );

  static const LinearGradient criticalGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF991B1B), Color(0xFF7F1D1D)],
  );

  static const LinearGradient cyanGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0891B2), Color(0xFF0E7490)],
  );
}
