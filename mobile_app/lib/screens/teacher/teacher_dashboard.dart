import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/teacher_theme.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';

class TeacherDashboard extends StatefulWidget {
  const TeacherDashboard({super.key});

  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class _TeacherDashboardState extends State<TeacherDashboard> {
  final _api = ApiService();
  String _name = '';
  String? _imageUrl;
  bool _loading = true;
  String? _error;
  List<dynamic> _timetable = [];

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
      final data = await _api.getTeacherProfile();
      if (!mounted) return;
      setState(() {
        _name = data['name'] as String? ?? '';
        _imageUrl = data['imageUrl'] as String?;
      });
    } catch (e) {
      if (!mounted) return;
      String fallbackName = '';
      try {
        final user = await AuthService().getUser();
        final email = user?['email'] as String?;
        if (email != null && email.isNotEmpty) {
          fallbackName = email.split('@').first;
          if (fallbackName.length > 1) {
            fallbackName = fallbackName[0].toUpperCase() + fallbackName.substring(1);
          }
        }
      } catch (_) {}
      setState(() {
        _name = fallbackName.isNotEmpty ? fallbackName : 'Teacher';
        _imageUrl = null;
      });
    }
    try {
      final slots = await _api.getTeacherTimetable();
      if (!mounted) return;
      setState(() => _timetable = slots);
    } catch (_) {
      if (mounted) setState(() => _timetable = []);
    }
    if (mounted) setState(() => _loading = false);
  }

  int get _todayDayOfWeek => DateTime.now().weekday;
  List<dynamic> get _todaySlots => _timetable
      .where((s) => (s['dayOfWeek'] as int?) == _todayDayOfWeek)
      .toList()
    ..sort((a, b) => (a['periodNumber'] as int) - (b['periodNumber'] as int));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF92400E),
              Color(0xFFB45309),
              Color(0xFFD97706),
              Color(0xFFF59E0B),
            ],
          ),
        ),
        child: SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Colors.white))
              : RefreshIndicator(
                      onRefresh: _load,
                      color: TeacherColors.primary,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildAppBar(),
                            const SizedBox(height: 24),
                            _buildTeacherCard(),
                            const SizedBox(height: 24),
                            _buildKpiCards(),
                            const SizedBox(height: 24),
                            _buildPlannerSection(),
                            const SizedBox(height: 24),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: Text(
                                'Quick Access',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white.withOpacity(0.95),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            _buildSectionCards(),
                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, Teacher',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              Text(
                'Manage your classes',
                style: GoogleFonts.sourceSans3(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.9),
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 26),
            onPressed: () async {
              await AuthService().logout();
              if (context.mounted) Navigator.pushReplacementNamed(context, '/');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTeacherAvatar() {
    final initial = _name.isNotEmpty ? _name[0].toUpperCase() : 'T';
    if (_imageUrl == null || _imageUrl!.trim().isEmpty) {
      return CircleAvatar(
        radius: 40,
        backgroundColor: TeacherColors.primary.withOpacity(0.15),
        child: Text(
          initial,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: TeacherColors.primary,
          ),
        ),
      );
    }
    return ClipOval(
      child: Image.network(
        _imageUrl!,
        width: 80,
        height: 80,
        fit: BoxFit.cover,
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: TeacherColors.primary.withOpacity(0.15),
                  child: Text(
                    initial,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: TeacherColors.primary,
                    ),
                  ),
                ),
                if (progress.expectedTotalBytes != null)
                  CircularProgressIndicator(
                    value: progress.cumulativeBytesLoaded / (progress.expectedTotalBytes ?? 1),
                    strokeWidth: 2,
                    color: TeacherColors.primary,
                  ),
              ],
            ),
          );
        },
        errorBuilder: (_, __, ___) => CircleAvatar(
          radius: 40,
          backgroundColor: TeacherColors.primary.withOpacity(0.15),
          child: Text(
            initial,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: TeacherColors.primary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTeacherCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            const Color(0xFFFFF7ED).withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: TeacherColors.primary.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildTeacherAvatar(),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _name.isNotEmpty ? _name : 'Teacher',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your profile',
                  style: GoogleFonts.sourceSans3(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCards() {
    final todayCount = _todaySlots.length;
    final weekTotal = _timetable.length;
    final subjects = <String>{};
    for (final s in _timetable) {
      final sub = s['subject'] as String?;
      if (sub != null && sub.isNotEmpty) subjects.add(sub);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Today\'s Overview',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white.withOpacity(0.95),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Today\'s Classes',
                  todayCount.toString(),
                  Icons.schedule_rounded,
                  [const Color(0xFF059669), const Color(0xFF34D399)],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Weekly Slots',
                  weekTotal.toString(),
                  Icons.calendar_month_rounded,
                  [const Color(0xFF7C3AED), const Color(0xFFA78BFA)],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Subjects',
                  subjects.length.toString(),
                  Icons.menu_book_rounded,
                  [const Color(0xFF0284C7), const Color(0xFF38BDF8)],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Next Period',
                  todayCount > 0 ? 'P${_todaySlots.first['periodNumber']}' : '—',
                  Icons.upcoming_rounded,
                  [const Color(0xFFB45309), const Color(0xFFFBBF24)],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, List<Color> gradient) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradient,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: gradient[0].withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.95), size: 24),
          const SizedBox(height: 12),
          Text(
            label,
            style: GoogleFonts.sourceSans3(
              fontSize: 12,
              color: Colors.white.withOpacity(0.9),
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlannerSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'My Planner',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withOpacity(0.95),
                ),
              ),
              if (_timetable.isNotEmpty)
                Text(
                  '${_timetable.length} slots',
                  style: GoogleFonts.sourceSans3(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white,
                  TeacherColors.primary.withOpacity(0.06),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: TeacherColors.primary.withOpacity(0.15), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
                BoxShadow(
                  color: TeacherColors.primary.withOpacity(0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: _timetable.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'No timetable assigned yet.\nAsk admin to add your schedule.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.sourceSans3(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  )
                : _buildPlannerGrid(),
          ),
        ],
      ),
    );
  }

  Widget _buildPlannerGrid() {
    final byDay = <int, List<dynamic>>{};
    for (final s in _timetable) {
      final d = s['dayOfWeek'] as int? ?? 0;
      byDay.putIfAbsent(d, () => []).add(s);
    }
    for (final list in byDay.values) {
      list.sort((a, b) => (a['periodNumber'] as int) - (b['periodNumber'] as int));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _days.asMap().entries.map((e) {
        final dayNum = e.key + 1;
        final slots = byDay[dayNum] ?? [];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                e.value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: TeacherColors.primary,
                ),
              ),
              const SizedBox(height: 6),
              if (slots.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    'No classes',
                    style: GoogleFonts.sourceSans3(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                )
              else
                ...slots.map((s) {
                  final cls = s['class'] as Map<String, dynamic>?;
                  final className = cls != null
                      ? '${cls['name'] ?? ''}-${cls['section'] ?? ''}'
                      : '—';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: TeacherColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: TeacherColors.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: TeacherColors.primary.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'P${s['periodNumber'] ?? '?'}',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: TeacherColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s['subject'] as String? ?? '—',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                className,
                                style: GoogleFonts.sourceSans3(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSectionCards() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          _buildSectionCard(
            icon: Icons.assignment_outlined,
            title: 'Post Homework',
            subtitle: 'Add homework for your class',
            gradient: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
            onTap: () async {
              final ok = await Navigator.pushNamed(context, '/teacher/post-homework');
              if (ok == true && context.mounted) {}
            },
          ),
          const SizedBox(height: 14),
          _buildSectionCard(
            icon: Icons.people_outlined,
            title: 'Class List',
            subtitle: 'View students in your classes',
            gradient: const [Color(0xFF059669), Color(0xFF34D399)],
            onTap: () => Navigator.pushNamed(context, '/teacher/class-list'),
          ),
          const SizedBox(height: 14),
          _buildSectionCard(
            icon: Icons.upload_file_outlined,
            title: 'Bulk Upload',
            subtitle: 'Upload results or attendance',
            gradient: const [Color(0xFF0284C7), Color(0xFF38BDF8)],
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white,
                gradient[0].withOpacity(0.08),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: gradient[0].withOpacity(0.2), width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.06),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color: gradient[0].withOpacity(0.2),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: gradient),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: gradient[0].withOpacity(0.5),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: GoogleFonts.sourceSans3(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: gradient[0].withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.arrow_forward_rounded, size: 20, color: gradient[0]),
              ),
            ],
          ),
        ),
      ),
    );
  }

}
