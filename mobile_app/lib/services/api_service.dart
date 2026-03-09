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
    final res = await http.get(uri, headers: await _headers());
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
    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode == 401) throw Exception('Session expired');
    if (res.statusCode != 200) throw Exception('Failed to load bus info');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
