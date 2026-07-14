import 'package:flutter/material.dart';

class AppColors {
  static const bg = Color(0xFF0E1218);
  static const panel = Color(0xFF1A2028);
  static const panel2 = Color(0xFF232B36);
  static const border = Color(0xFF2D3644);
  static const text = Color(0xFFE8EEF5);
  static const textDim = Color(0xFF94A3B8);
  static const textMute = Color(0xFF64748B);
  static const emerald = Color(0xFF3BA7D6);
  static const emerald2 = Color(0xFF22D3EE);
  static const gold = Color(0xFFFCD34D);
  static const online = Color(0xFF22C55E);
  static const away = Color(0xFFF59E0B);
  static const danger = Color(0xFFEF4444);

  static const gradient = LinearGradient(
    colors: [emerald, emerald2],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

ThemeData appTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg,
    primaryColor: AppColors.emerald,
    canvasColor: AppColors.panel,
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: AppColors.text),
      bodyMedium: TextStyle(color: AppColors.text),
      titleLarge: TextStyle(color: AppColors.text, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.panel2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.emerald),
      ),
      labelStyle: const TextStyle(color: AppColors.textDim),
    ),
  );
}
