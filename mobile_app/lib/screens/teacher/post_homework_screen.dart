import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class PostHomeworkScreen extends StatefulWidget {
  const PostHomeworkScreen({super.key});

  @override
  State<PostHomeworkScreen> createState() => _PostHomeworkScreenState();
}

class _PostHomeworkScreenState extends State<PostHomeworkScreen> {
  final _api = ApiService();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();

  List<dynamic> _classes = [];
  String? _selectedClassId;
  DateTime? _dueDate;
  bool _loading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _loadClasses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getClasses();
      if (!mounted) return;
      setState(() {
        _classes = data;
        _loading = false;
        if (_classes.isNotEmpty && _selectedClassId == null) {
          _selectedClassId = (_classes.first as Map)['id']?.toString();
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Enter homework title');
      return;
    }
    if (_selectedClassId == null) {
      setState(() => _error = 'Select a class');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.postHomework(
        title: title,
        description: _descController.text.trim().isEmpty ? null : _descController.text.trim(),
        dueDate: _dueDate?.toIso8601String(),
        classId: _selectedClassId!,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Post homework', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                      child: Text(_error!, style: GoogleFonts.sourceSans3(color: Colors.red.shade800)),
                    ),
                  ],
                  Text('Title', style: GoogleFonts.sourceSans3(fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _titleController,
                    decoration: const InputDecoration(hintText: 'e.g. Complete Chapter 5 exercises'),
                  ),
                  const SizedBox(height: 20),
                  Text('Description (optional)', style: GoogleFonts.sourceSans3(fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descController,
                    maxLines: 3,
                    decoration: const InputDecoration(hintText: 'Add details...'),
                  ),
                  const SizedBox(height: 20),
                  Text('Class', style: GoogleFonts.sourceSans3(fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedClassId,
                    decoration: const InputDecoration(),
                    items: _classes.map((c) {
                      final m = c as Map<String, dynamic>;
                      final id = m['id']?.toString() ?? '';
                      final name = '${m['name'] ?? ''} - ${m['section'] ?? ''}';
                      return DropdownMenuItem(value: id, child: Text(name));
                    }).toList(),
                    onChanged: (v) => setState(() => _selectedClassId = v),
                  ),
                  const SizedBox(height: 20),
                  Text('Due date (optional)', style: GoogleFonts.sourceSans3(fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (d != null) setState(() => _dueDate = d);
                    },
                    child: InputDecorator(
                      decoration: const InputDecoration(),
                      child: Text(
                        _dueDate != null ? '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}' : 'Select date',
                        style: GoogleFonts.sourceSans3(color: _dueDate != null ? AppColors.textPrimary : AppColors.textSecondary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      child: _saving ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Post homework'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
