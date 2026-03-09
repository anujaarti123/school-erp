import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class BusScreen extends StatefulWidget {
  const BusScreen({super.key});

  @override
  State<BusScreen> createState() => _BusScreenState();
}

class _BusScreenState extends State<BusScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _selectedChild;
  String? _loadedForChildId;
  List<dynamic> _children = [];
  bool _loading = true;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _selectedChild = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final childId = _selectedChild?['id'] as String?;
    if (childId != _loadedForChildId) {
      _loadedForChildId = childId;
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getBusMyChildren();
      if (!mounted) return;
      var list = data['children'] as List<dynamic>? ?? [];
      final sid = _selectedChild?['id'] as String?;
      if (sid != null) {
        list = list.where((c) => (c['student'] as Map?)?['id'] == sid).toList();
      }
      setState(() {
        _children = list;
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
        title: Text('Bus', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
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
              : _children.isEmpty
                  ? Center(
                      child: Text(
                        'No children linked',
                        style: GoogleFonts.sourceSans3(fontSize: 16, color: AppColors.textSecondary),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _children.length,
                        itemBuilder: (context, i) {
                          final item = _children[i] as Map<String, dynamic>;
                          final student = item['student'] as Map<String, dynamic>? ?? {};
                          final busInfo = item['busInfo'] as Map<String, dynamic>?;
                          return _buildChildCard(student, busInfo);
                        },
                      ),
                    ),
    );
  }

  Widget _buildChildCard(Map<String, dynamic> student, Map<String, dynamic>? busInfo) {
    final name = student['name'] as String? ?? '—';
    final rollNo = student['rollNo'] as String? ?? '';
    final classData = student['class'] as Map<String, dynamic>?;
    final className = classData != null ? '${classData['name'] ?? ''}-${classData['section'] ?? ''}' : '—';

    if (busInfo == null) {
      return Card(
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.textSecondary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.directions_bus_outlined, color: AppColors.textSecondary, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('$rollNo • $className', style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text('No bus assigned', style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary)),
            ],
          ),
        ),
      );
    }

    final route = busInfo['route'] as Map<String, dynamic>? ?? {};
    final routeName = route['name'] as String? ?? '—';
    final driver = route['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] as String? ?? '—';
    final driverPhone = driver?['phone'] as String?;
    final vehicle = route['vehicle'] as Map<String, dynamic>?;
    final busNumber = vehicle?['busNumber'] as String? ?? '—';
    final pickup = busInfo['pickup'] as Map<String, dynamic>?;
    final drop = busInfo['drop'] as Map<String, dynamic>?;
    final pickupName = pickup?['name'] as String? ?? '—';
    final pickupTime = pickup?['arrivalTime'] as String? ?? '—';
    final dropName = drop?['name'] as String? ?? '—';
    final dropTime = drop?['departureTime'] as String? ?? '—';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.directions_bus, color: AppColors.success, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                      Text('$rollNo • $className', style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoRow(Icons.route, 'Route', routeName),
                  _buildInfoRow(Icons.directions_bus, 'Bus', busNumber),
                  _buildInfoRow(Icons.person, 'Driver', driverName),
                  const Divider(height: 16),
                  _buildInfoRow(Icons.place, 'Pickup', '$pickupName — Arriving ~$pickupTime'),
                  _buildInfoRow(Icons.flag, 'Drop', '$dropName — Leaving school ~$dropTime'),
                  if (driverPhone != null && driverPhone.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text('Driver contact: $driverPhone', style: GoogleFonts.sourceSans3(fontSize: 13, color: AppColors.textSecondary)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
                Text(value, style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textPrimary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
