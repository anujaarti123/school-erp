import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class HomeworkListScreen extends StatefulWidget {
  const HomeworkListScreen({super.key});

  @override
  State<HomeworkListScreen> createState() => _HomeworkListScreenState();
}

class _HomeworkListScreenState extends State<HomeworkListScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _selectedChild;
  String? _loadedForClassId;
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _selectedChild = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final classId = _selectedChild?['class']?['id'] as String?;
    if (classId != _loadedForClassId) {
      _loadedForClassId = classId;
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getHomework();
      if (!mounted) return;
      final classId = _selectedChild?['class']?['id'] as String?;
      final filtered = classId != null
          ? data.where((h) => (h as Map<String, dynamic>)['classId'] == classId).toList()
          : data;
      setState(() {
        _items = filtered;
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
        title: Text('Homework', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
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
              : _items.isEmpty
                  ? Center(
                      child: Text(
                        'No homework yet',
                        style: GoogleFonts.sourceSans3(fontSize: 16, color: AppColors.textSecondary),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        itemBuilder: (context, i) {
                          final h = _items[i] as Map<String, dynamic>;
                          final classInfo = h['class'] as Map<String, dynamic>?;
                          final className = classInfo != null ? '${classInfo['name'] ?? ''}${classInfo['section'] ?? ''}' : '';
                          final dueDate = h['dueDate'];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              title: Text(
                                h['title']?.toString() ?? '',
                                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600, fontSize: 16),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if ((h['description'] ?? '').toString().isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        h['description'].toString(),
                                        style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary),
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  if (className.isNotEmpty || dueDate != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Row(
                                        children: [
                                          if (className.isNotEmpty)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary.withOpacity(0.12),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(className, style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.primary)),
                                            ),
                                          if (dueDate != null) ...[
                                            const SizedBox(width: 8),
                                            Text(
                                              'Due: ${_formatDate(dueDate)}',
                                              style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  String _formatDate(dynamic d) {
    if (d == null) return '';
    try {
      final dt = DateTime.parse(d.toString());
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return d.toString();
    }
  }
}
