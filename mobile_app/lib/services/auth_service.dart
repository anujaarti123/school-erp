import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config.dart';

class AuthService {
  static const _keyToken = 'auth_token';
  static const _keyUser = 'auth_user';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_keyUser);
    if (json == null) return null;
    return Map<String, dynamic>.from(jsonDecode(json) as Map);
  }

  Future<void> saveSession(String token, Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keyUser, jsonEncode(user));
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, dynamic>?> loginTeacher(String email, String password) async {
    final baseUrl = await ApiConfig.getBaseUrl();
    final uri = Uri.parse('$baseUrl/api/auth/login');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    ).timeout(const Duration(seconds: 25));
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    if (res.statusCode != 200) {
      throw Exception(body?['error'] ?? 'Login failed');
    }
    final token = body!['token'] as String?;
    final user = body['user'] as Map<String, dynamic>?;
    if (token != null && user != null) {
      await saveSession(token, user);
      return user;
    }
    throw Exception('Invalid response');
  }

  static String _normalizePhone(String phone) {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 10) return digits.substring(0, 10); // Take first 10 if typo
    return digits;
  }

  Future<Map<String, dynamic>?> loginParent(String phone) async {
    final baseUrl = await ApiConfig.getBaseUrl();
    final uri = Uri.parse('$baseUrl/api/auth/parent');
    final normalized = _normalizePhone(phone.trim());
    if (normalized.length < 10) throw Exception('Enter valid 10-digit phone number');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': normalized}),
    ).timeout(const Duration(seconds: 25));
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    if (res.statusCode != 200) {
      throw Exception(body?['error'] ?? 'Login failed');
    }
    final token = body!['token'] as String?;
    final user = body['user'] as Map<String, dynamic>?;
    if (token != null && user != null) {
      await saveSession(token, user);
      return user;
    }
    throw Exception('Invalid response');
  }

  Future<void> logout() async {
    await clearSession();
  }
}
