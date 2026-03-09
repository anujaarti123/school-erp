import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/teacher_theme.dart';
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
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Class List', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: TeacherColors.primary))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.sourceSans3(color: AppColors.textSecondary)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _load,
                          style: ElevatedButton.styleFrom(backgroundColor: TeacherColors.primary),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _classes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.school_outlined, size: 64, color: AppColors.textSecondary.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          Text(
                            'No classes assigned',
                            style: GoogleFonts.sourceSans3(fontSize: 16, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: TeacherColors.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _classes.length,
                        itemBuilder: (context, i) {
                          final c = _classes[i] as Map<String, dynamic>;
                          final id = c['id']?.toString() ?? '';
                          final name = '${c['name'] ?? ''} - ${c['section'] ?? ''}';
                          final students = _studentsByClass[id] ?? [];
                          return _buildClassCard(name, students);
                        },
                      ),
                    ),
    );
  }

  Widget _buildClassCard(String className, List<dynamic> students) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          childrenPadding: const EdgeInsets.only(left: 20, right: 20, bottom: 16),
          leading: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFB45309), Color(0xFFD97706)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.class_rounded, color: Colors.white, size: 24),
          ),
          title: Text(
            className,
            style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '${students.length} students',
              style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary),
            ),
          ),
          children: students.isEmpty
              ? [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('No students', style: GoogleFonts.sourceSans3(color: AppColors.textSecondary)),
                  ),
                ]
              : students.map((s) => _buildStudentTile(s)).toList(),
        ),
      ),
    );
  }

  Widget _buildStudentTile(dynamic s) {
    final name = s['name']?.toString() ?? '—';
    final rollNo = s['rollNo']?.toString() ?? '';
    final imageUrl = s['imageUrl'] as String?;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: TeacherColors.primary.withOpacity(0.15),
            backgroundImage: imageUrl != null && imageUrl.isNotEmpty ? NetworkImage(imageUrl) : null,
            child: imageUrl == null || imageUrl.isEmpty
                ? Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: GoogleFonts.plusJakartaSans(color: TeacherColors.primary, fontWeight: FontWeight.w700, fontSize: 16),
                  )
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600, fontSize: 15)),
                Text('Roll: $rollNo', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
