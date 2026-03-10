import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';

class ParentDashboard extends StatefulWidget {
  const ParentDashboard({super.key});

  @override
  State<ParentDashboard> createState() => _ParentDashboardState();
}

class _ParentDashboardState extends State<ParentDashboard> {
  final _api = ApiService();
  List<dynamic> _children = [];
  int _selectedIndex = 0;
  bool _loading = true;
  String? _error;
  double _totalFeePending = 0;
  int _homeworkCount = 0;
  int _overdueHomeworkCount = 0;
  int _childrenWithBus = 0;
  List<dynamic> _banners = [];
  final _bannerController = PageController();
  int _bannerPage = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _bannerController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getParentChildren();
      if (!mounted) return;
      setState(() {
        _children = data;
        _selectedIndex = _children.isNotEmpty ? 0 : -1;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
      return;
    }
    await _loadKpis();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadKpis() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    try {
      final fees = await _api.getFeesMyChildren();
      if (!mounted) return;
      double total = 0;
      final topDue = fees['totalDue'];
      if (topDue != null) {
        if (topDue is num) total = topDue.toDouble();
        else if (topDue is String) total = double.tryParse(topDue) ?? 0;
      }
      if (total == 0) {
        final children = fees['children'] as List<dynamic>? ?? [];
        for (final c in children) {
          final d = c['totalDue'];
          if (d is num) total += d.toDouble();
          else if (d is String) total += double.tryParse(d) ?? 0;
        }
      }
      setState(() => _totalFeePending = total);
    } catch (_) {
      if (mounted) setState(() => _totalFeePending = 0);
    }
    try {
      final hwList = await _api.getHomework();
      if (!mounted) return;
      int overdue = 0;
      for (final h in hwList) {
        final due = h['dueDate'] as String?;
        if (due != null) {
          try {
            final d = DateTime.parse(due);
            if (DateTime(d.year, d.month, d.day).isBefore(today)) overdue++;
          } catch (_) {}
        }
      }
      setState(() {
        _homeworkCount = hwList.length;
        _overdueHomeworkCount = overdue;
      });
    } catch (_) {
      if (mounted) setState(() {
        _homeworkCount = 0;
        _overdueHomeworkCount = 0;
      });
    }
    try {
      final busData = await _api.getBusMyChildren();
      if (!mounted) return;
      final list = busData['children'] as List<dynamic>? ?? [];
      int withBus = 0;
      for (final c in list) {
        if (c['busInfo'] != null) withBus++;
      }
      setState(() => _childrenWithBus = withBus);
    } catch (_) {
      if (mounted) setState(() => _childrenWithBus = 0);
    }
    try {
      final list = await _api.getBanners();
      if (mounted) setState(() => _banners = list);
    } catch (_) {
      if (mounted) setState(() => _banners = []);
    }
  }

  dynamic get _selectedChild =>
      _children.isNotEmpty && _selectedIndex >= 0 && _selectedIndex < _children.length
          ? _children[_selectedIndex]
          : null;

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
              Color(0xFF0F766E),
              Color(0xFF0D9488),
              Color(0xFF14B8A6),
              Color(0xFF2DD4BF),
            ],
          ),
        ),
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                )
              : _error != null
                  ? _buildError()
                  : _children.isEmpty
                      ? _buildEmpty()
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: AppColors.primary,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildAppBar(),
                                const SizedBox(height: 24),
                                if (_banners.isNotEmpty) ...[
                                  _buildBannerCarousel(),
                                  const SizedBox(height: 24),
                                ],
                                _buildChildSelector(),
                                const SizedBox(height: 24),
                                _buildKpiSection(),
                                const SizedBox(height: 24),
                                if (_selectedChild != null) ...[
                                  _buildClassTeacherCard(),
                                  const SizedBox(height: 20),
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
                'Hello, Parent',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              Text(
                'Manage your children',
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

  Widget _buildBannerCarousel() {
    final screenHeight = MediaQuery.of(context).size.height;
    final bannerHeight = (screenHeight * 0.22).clamp(140.0, 200.0);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: bannerHeight,
          child: PageView.builder(
            controller: _bannerController,
            onPageChanged: (i) => setState(() => _bannerPage = i),
            itemCount: _banners.length,
            itemBuilder: (context, i) {
          final b = _banners[i] as Map<String, dynamic>;
          final imageUrl = b['imageUrl'] as String? ?? '';
          final title = b['title'] as String? ?? '';
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.white.withOpacity(0.3),
                      child: Icon(Icons.image_not_supported_rounded, size: 48, color: Colors.white70),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withOpacity(0.6)],
                      ),
                    ),
                  ),
                  if (title.isNotEmpty)
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: Text(
                        title,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          shadows: [
                            Shadow(color: Colors.black.withOpacity(0.5), blurRadius: 4, offset: const Offset(0, 2)),
                          ],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ),
          );
            },
          ),
        ),
        if (_banners.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_banners.length, (i) {
              final isActive = i == _bannerPage;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isActive ? 20 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.white.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }

  Widget _buildChildSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Select Child',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white.withOpacity(0.95),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: (MediaQuery.of(context).size.height * 0.16).clamp(100.0, 140.0),
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _children.length,
            itemBuilder: (context, i) {
              final c = _children[i] as Map<String, dynamic>;
              final name = c['name'] as String? ?? '—';
              final imageUrl = c['imageUrl'] as String?;
              final classData = c['class'] as Map<String, dynamic>?;
              final className = classData != null
                  ? '${classData['name'] ?? ''}-${classData['section'] ?? ''}'
                  : '';
              final isSelected = i == _selectedIndex;
              return GestureDetector(
                onTap: () => setState(() => _selectedIndex = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.white
                        : Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isSelected ? 0.15 : 0.08),
                        blurRadius: isSelected ? 12 : 6,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: isSelected
                            ? AppColors.primary.withOpacity(0.15)
                            : Colors.white.withOpacity(0.5),
                        backgroundImage: imageUrl != null && imageUrl.toString().isNotEmpty
                            ? NetworkImage(imageUrl.toString())
                            : null,
                        child: imageUrl == null || imageUrl.toString().isEmpty
                            ? Text(
                                name.isNotEmpty ? name[0].toUpperCase() : '?',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? AppColors.primary : Colors.white,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: 80,
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? AppColors.textPrimary : Colors.white,
                          ),
                        ),
                      ),
                      if (className.isNotEmpty)
                        Text(
                          className,
                          style: GoogleFonts.sourceSans3(
                            fontSize: 11,
                            color: isSelected ? AppColors.textSecondary : Colors.white.withOpacity(0.9),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildKpiSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Overview',
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
                  'Fees Pending',
                  _totalFeePending > 0 ? '₹${_totalFeePending.toStringAsFixed(0)}' : '₹0',
                  Icons.payment_rounded,
                  const Color(0xFFDC2626),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Homework',
                  '$_homeworkCount',
                  Icons.assignment_rounded,
                  const Color(0xFF7C3AED),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Overdue',
                  '$_overdueHomeworkCount',
                  Icons.warning_amber_rounded,
                  const Color(0xFFD97706),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Bus Assigned',
                  _children.isEmpty ? '—' : '$_childrenWithBus/${_children.length}',
                  Icons.directions_bus_rounded,
                  const Color(0xFF0284C7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, Color color) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (label == 'Fees Pending' && _totalFeePending > 0) {
            Navigator.pushNamed(context, '/parent/fees', arguments: _selectedChild);
          } else if (label == 'Homework' || label == 'Overdue') {
            Navigator.pushNamed(context, '/parent/homework', arguments: _selectedChild);
          } else if (label == 'Bus Assigned') {
            Navigator.pushNamed(context, '/parent/bus', arguments: _selectedChild);
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      label,
                      style: GoogleFonts.sourceSans3(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClassTeacherCard() {
    final ct = _selectedChild?['classTeacher'] as Map<String, dynamic>?;
    final teacherName = ct?['name'] as String?;
    final teacherEmail = ct?['email'] as String?;
    final teacherPhone = ct?['phone'] as String?;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.school_rounded, color: Color(0xFFD97706), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Class Teacher',
                      style: GoogleFonts.sourceSans3(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      teacherName ?? 'Not assigned',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (teacherName != null && (teacherEmail != null || teacherPhone != null)) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Text(
              'For clarification, contact:',
              style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary),
            ),
            if (teacherEmail != null && teacherEmail.toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(
                  children: [
                    const Icon(Icons.email_outlined, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text(teacherEmail.toString(), style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.primary)),
                  ],
                ),
              ),
            if (teacherPhone != null && teacherPhone.toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(
                  children: [
                    const Icon(Icons.phone_outlined, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text(teacherPhone.toString(), style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.primary)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionCards() {
    final child = _selectedChild;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          _buildSectionCard(
            icon: Icons.assignment_rounded,
            title: 'Homework',
            subtitle: 'View assignments',
            gradient: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
            onTap: () => Navigator.pushNamed(context, '/parent/homework', arguments: child),
          ),
          const SizedBox(height: 14),
          _buildSectionCard(
            icon: Icons.payment_rounded,
            title: 'Fees',
            subtitle: 'Dues & payment',
            gradient: const [Color(0xFF059669), Color(0xFF34D399)],
            onTap: () => Navigator.pushNamed(context, '/parent/fees', arguments: child),
          ),
          const SizedBox(height: 14),
          _buildSectionCard(
            icon: Icons.directions_bus_rounded,
            title: 'Bus',
            subtitle: 'Route & timings',
            gradient: const [Color(0xFF0284C7), Color(0xFF38BDF8)],
            onTap: () => Navigator.pushNamed(context, '/parent/bus', arguments: child),
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
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: gradient),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: gradient[0].withOpacity(0.4),
                      blurRadius: 8,
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
              Icon(Icons.arrow_forward_ios_rounded, size: 18, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded, size: 64, color: Colors.white.withOpacity(0.8)),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: GoogleFonts.sourceSans3(fontSize: 16, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              'Ensure your child is linked to your phone in admin.',
              textAlign: TextAlign.center,
              style: GoogleFonts.sourceSans3(fontSize: 13, color: Colors.white.withOpacity(0.85)),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_off_rounded, size: 64, color: Colors.white.withOpacity(0.8)),
            const SizedBox(height: 16),
            Text(
              'No children linked',
              style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              'Contact school admin to add your child',
              textAlign: TextAlign.center,
              style: GoogleFonts.sourceSans3(fontSize: 14, color: Colors.white.withOpacity(0.9)),
            ),
          ],
        ),
      ),
    );
  }
}
