import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Premium color palette — not ordinary black/white
class AppColors {
  static const Color primary = Color(0xFF0F766E);       // Deep teal
  static const Color primaryLight = Color(0xFF14B8A6);    // Soft teal
  static const Color background = Color(0xFFF8FAFC);       // Off-white
  static const Color surface = Color(0xFFFFFFFF);          // Cards, inputs
  static const Color textPrimary = Color(0xFF1E293B);     // Charcoal — not black
  static const Color textSecondary = Color(0xFF64748B);   // Muted
  static const Color accent = Color(0xFFD97706);          // Amber
  static const Color success = Color(0xFF059669);        // Green
  static const Color error = Color(0xFFDC2626);          // Soft red
}

/// Premium theme with Plus Jakarta Sans + Source Sans 3
ThemeData get appTheme => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    primaryContainer: AppColors.primaryLight.withOpacity(0.2),
    secondary: AppColors.accent,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
    onSurfaceVariant: AppColors.textSecondary,
    error: AppColors.error,
    onError: Colors.white,
    outline: AppColors.textSecondary.withOpacity(0.3),
  ),
  scaffoldBackgroundColor: AppColors.background,
  textTheme: TextTheme(
    displayLarge: GoogleFonts.plusJakartaSans(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
    ),
    displayMedium: GoogleFonts.plusJakartaSans(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    headlineMedium: GoogleFonts.plusJakartaSans(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    titleLarge: GoogleFonts.plusJakartaSans(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
    titleMedium: GoogleFonts.plusJakartaSans(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: AppColors.textPrimary,
    ),
    bodyLarge: GoogleFonts.sourceSans3(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
    ),
    bodyMedium: GoogleFonts.sourceSans3(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
    ),
    labelLarge: GoogleFonts.sourceSans3(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
  ),
  appBarTheme: AppBarTheme(
    elevation: 0,
    centerTitle: true,
    backgroundColor: AppColors.surface,
    foregroundColor: AppColors.textPrimary,
    titleTextStyle: GoogleFonts.plusJakartaSans(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
  ),
  cardTheme: CardThemeData(
    elevation: 0,
    color: AppColors.surface,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      textStyle: GoogleFonts.sourceSans3(fontSize: 16, fontWeight: FontWeight.w600),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    hintStyle: GoogleFonts.sourceSans3(color: AppColors.textSecondary),
  ),
);
