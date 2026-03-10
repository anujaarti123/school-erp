import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import '../core/config.dart';

class ApiService {
  final AuthService _auth = AuthService();

  Future<Map<String, String>> _headers() async {
    final token = await _auth.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<String> _baseUrl() => ApiConfig.getBaseUrl();

  Future<List<dynamic>> getHomework() async {
    final uri = Uri.parse('${await _baseUrl()}/api/homework');
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load homework');
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    return (body?['data'] as List?) ?? [];
  }

  Future<List<dynamic>> getClasses() async {
    final uri = Uri.parse('${await _baseUrl()}/api/classes');
    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load classes');
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    return (body?['data'] as List?) ?? [];
  }

  Future<List<dynamic>> getStudents({String? classId}) async {
    var uri = Uri.parse('${await _baseUrl()}/api/students');
    if (classId != null) {
      uri = uri.replace(queryParameters: {'classId': classId});
    }
    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load students');
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    return (body?['data'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> postHomework({
    required String title,
    String? description,
    String? dueDate,
    required String classId,
  }) async {
    final uri = Uri.parse('${await _baseUrl()}/api/homework');
    final res = await http.post(
      uri,
      headers: await _headers(),
      body: jsonEncode({
        'title': title,
        'description': description,
        'dueDate': dueDate,
        'classId': classId,
      }),
    );
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode == 403) throw Exception('Not assigned to this class');
    if (res.statusCode != 201) {
      final body = jsonDecode(res.body) as Map<String, dynamic>?;
      throw Exception(body?['error'] ?? 'Failed to post homework');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getFeeStructure() async {
    // Placeholder - fee API can be added later
    return [];
  }

  Future<Map<String, dynamic>> getBusMyChildren() async {
    final uri = Uri.parse('${await _baseUrl()}/api/bus/my-children');
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load bus info');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getParentChildren() async {
    // Try new parent API first
    try {
      final uri = Uri.parse('${await _baseUrl()}/api/parent/children');
      final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 15));
      if (res.statusCode == 401) throw Exception('Session expired');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>?;
        return (body?['children'] as List?) ?? [];
      }
    } catch (_) {}
    // Fallback: use bus my-children (works with older backend)
    try {
      final data = await getBusMyChildren();
      final list = data['children'] as List<dynamic>? ?? [];
      return list.map((c) {
        final s = c['student'] as Map<String, dynamic>? ?? {};
        final cls = s['class'] as Map<String, dynamic>?;
        return {
          'id': s['id'],
          'name': s['name'],
          'rollNo': s['rollNo'],
          'imageUrl': s['imageUrl'],
          'class': cls != null ? {'id': cls['id'], 'name': cls['name'], 'section': cls['section']} : null,
          'classTeacher': null,
        };
      }).toList();
    } catch (e) {
      throw Exception('Failed to load children. Check connection.');
    }
  }

  Future<List<dynamic>> getTeacherTimetable() async {
    final uri = Uri.parse('${await _baseUrl()}/api/planner/my-timetable');
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode == 403) return [];
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body) as Map<String, dynamic>?;
    return (body?['data'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> getTeacherProfile() async {
    final uri = Uri.parse('${await _baseUrl()}/api/teachers/me');
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode == 403) throw Exception('Access denied');
    if (res.statusCode != 200) throw Exception('Failed to load profile');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getBanners() async {
    final uri = Uri.parse('${await _baseUrl()}/api/banners');
    try {
      final res = await http.get(uri).timeout(const Duration(seconds: 45));
      if (res.statusCode != 200) return [];
      final body = jsonDecode(res.body) as Map<String, dynamic>?;
      final list = (body?['banners'] as List?) ?? [];
      return list.where((b) {
        final url = b is Map ? b['imageUrl']?.toString().trim() : null;
        return url != null && url.isNotEmpty;
      }).toList();
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getFeesMyChildren({
    bool summaryOnly = false,
    String? session,
    int? month,
    String? status,
  }) async {
    final params = <String, String>{};
    if (summaryOnly) params['summaryOnly'] = '1';
    if (session != null && session.isNotEmpty) params['session'] = session;
    if (month != null && month >= 1 && month <= 12) params['month'] = month.toString();
    if (status != null && status.isNotEmpty && status != 'all') params['status'] = status;
    final uri = Uri.parse('${await _baseUrl()}/api/fees/my-children')
        .replace(queryParameters: params.isNotEmpty ? params : null);
    final res = await http.get(uri, headers: await _headers()).timeout(const Duration(seconds: 25));
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load fees');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
