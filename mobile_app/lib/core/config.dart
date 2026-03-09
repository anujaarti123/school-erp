/// API base URL. Supports runtime override via SharedPreferences.
/// - Emulator: http://10.0.2.2:4000 (default)
/// - Physical device: Enter your PC's IP on login screen, e.g. http://192.168.1.5:4000
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _keyApiUrl = 'api_base_url';
  static const String _defaultUrl = 'http://10.0.2.2:4000';

  static String get _envUrl => const String.fromEnvironment(
    'API_URL',
    defaultValue: _defaultUrl,
  );

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_keyApiUrl);
    return (saved != null && saved.isNotEmpty) ? saved : _envUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      await prefs.remove(_keyApiUrl);
    } else {
      await prefs.setString(_keyApiUrl, trimmed.replaceAll(RegExp(r'/$'), ''));
    }
  }

}
