import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class ClassListScreen extends StatefulWidget {
  const ClassListScreen({super.key});

  @override
  State<ClassListScreen> createState() => _ClassListScreenState();
}

class _ClassListScreenState extends State<ClassListScreen> {
  final _api = ApiService();
  List<dynamic> _classes = [];
  Map<String, List<dynamic>> _studentsByClass = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final classes = await _api.getClasses();
      final byClass = <String, List<dynamic>>{};
      for (final c in classes) {
        final id = (c as Map)['id']?.toString();
        if (id != null) {
          final students = await _api.getStudents(classId: id);
          byClass[id] = students;
        }
      }
      if (!mounted) return;
      setState(() {
        _classes = classes;
        _studentsByClass = byClass;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Class list', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.sourceSans3(color: AppColors.textSecondary)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _classes.isEmpty
                  ? Center(
                      child: Text(
                        'No classes assigned',
                        style: GoogleFonts.sourceSans3(fontSize: 16, color: AppColors.textSecondary),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _classes.length,
                        itemBuilder: (context, i) {
                          final c = _classes[i] as Map<String, dynamic>;
                          final id = c['id']?.toString() ?? '';
                          final name = '${c['name'] ?? ''} - ${c['section'] ?? ''}';
                          final students = _studentsByClass[id] ?? [];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ExpansionTile(
                              title: Text(name, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
                              subtitle: Text('${students.length} students', style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary)),
                              children: students.isEmpty
                                  ? [ListTile(title: Text('No students', style: GoogleFonts.sourceSans3(color: AppColors.textSecondary)))]
                                  : students
                                      .map((s) => ListTile(
                                            leading: CircleAvatar(
                                              backgroundColor: AppColors.primary.withOpacity(0.2),
                                              child: Text(
                                                (s['rollNo'] ?? '?').toString().substring(0, 1).toUpperCase(),
                                                style: GoogleFonts.plusJakartaSans(color: AppColors.primary, fontWeight: FontWeight.w600),
                                              ),
                                            ),
                                            title: Text(s['name']?.toString() ?? ''),
                                            subtitle: Text('Roll: ${s['rollNo'] ?? ''}', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
                                          ))
                                      .toList(),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
