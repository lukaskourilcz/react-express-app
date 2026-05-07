import 'package:flutter/material.dart';

class BrandColors {
  static const green = Color(0xFF2D7A2D);
  static const greenDark = Color(0xFF246124);
  static const greenSoft = Color(0x14246124); // ~8% opacity
}

ThemeData buildTheme({Brightness brightness = Brightness.light}) {
  final isDark = brightness == Brightness.dark;
  final colorScheme = ColorScheme.fromSeed(
    seedColor: BrandColors.green,
    brightness: brightness,
  );

  final base = isDark ? ThemeData.dark() : ThemeData.light();

  return base.copyWith(
    colorScheme: colorScheme,
    scaffoldBackgroundColor: isDark ? const Color(0xFF0F1115) : const Color(0xFFF8F9FA),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF181A20) : Colors.white,
      foregroundColor: isDark ? Colors.white : const Color(0xFF1A1A1A),
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: isDark ? Colors.white : const Color(0xFF1A1A1A),
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      color: isDark ? const Color(0xFF181A20) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? const Color(0xFF2A2D35) : const Color(0xFFE5E5E5),
        ),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: BrandColors.green,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: BrandColors.green,
        side: const BorderSide(color: BrandColors.green),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: isDark ? const Color(0xFF1F222A) : Colors.white,
      labelStyle: TextStyle(
        color: isDark ? Colors.white70 : const Color(0xFF525252),
        fontWeight: FontWeight.w500,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isDark ? const Color(0xFF2A2D35) : const Color(0xFFE5E5E5)),
      ),
    ),
  );
}
