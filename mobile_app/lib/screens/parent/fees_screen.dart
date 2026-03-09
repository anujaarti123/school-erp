import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});

  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _selectedChild;
  String? _loadedForChildId;
  List<dynamic> _children = [];
  String? _feeUpiId;
  String? _adminWhatsApp;
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
      final data = await _api.getFeesMyChildren();
      if (!mounted) return;
      setState(() {
        _children = data['children'] as List<dynamic>? ?? [];
        _feeUpiId = data['feeUpiId'] as String?;
        _adminWhatsApp = data['adminWhatsApp'] as String?;
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

  dynamic _getChildData() {
    if (_selectedChild == null) return _children.isNotEmpty ? _children[0] : null;
    final sid = _selectedChild!['id'] as String?;
    final match = _children.where((c) {
      final s = c['student'] as Map<String, dynamic>?;
      return s?['id'] == sid;
    });
    return match.isNotEmpty ? match.first : (_children.isNotEmpty ? _children[0] : null);
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
        title: Text('Fees', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
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
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final childData = _getChildData();
    if (childData == null) {
      return Center(
        child: Text('No fee data', style: GoogleFonts.sourceSans3(fontSize: 16, color: AppColors.textSecondary)),
      );
    }

    final student = childData['student'] as Map<String, dynamic>? ?? {};
    final fees = childData['fees'] as List<dynamic>? ?? [];
    final childDue = (childData['totalDue'] as num?)?.toDouble() ?? 0;
    final name = student['name'] as String? ?? '—';
    final classData = student['class'] as Map<String, dynamic>?;
    final className = classData != null ? '${classData['name'] ?? ''}-${classData['section'] ?? ''}' : '';

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF34D399)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.success.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                  Text(className, style: GoogleFonts.sourceSans3(fontSize: 14, color: Colors.white.withOpacity(0.9))),
                  const SizedBox(height: 16),
                  Text(
                    'Total Due',
                    style: GoogleFonts.sourceSans3(fontSize: 12, color: Colors.white.withOpacity(0.9)),
                  ),
                  Text(
                    '₹${childDue.toStringAsFixed(0)}',
                    style: GoogleFonts.plusJakartaSans(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (fees.isNotEmpty) ...[
              Text('Fee History', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600),),
              const SizedBox(height: 12),
              ...fees.map((f) {
                final m = f['month'] as int? ?? 0;
                final y = f['year'] as int? ?? 0;
                final due = (f['dueAmount'] as num?)?.toDouble() ?? 0;
                final paid = (f['paidAmount'] as num?)?.toDouble() ?? 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    title: Text(_monthName(m), style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
                    subtitle: Text('$y', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (due > 0) Text('Due: ₹${due.toStringAsFixed(0)}', style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.error, fontWeight: FontWeight.w600)),
                        if (paid > 0) Text('Paid: ₹${paid.toStringAsFixed(0)}', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.success)),
                      ],
                    ),
                  ),
                );
              }),
            ],
            const SizedBox(height: 24),
            if (_feeUpiId != null && _feeUpiId!.isNotEmpty) ...[
              Text('Pay via UPI', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: const Icon(Icons.account_balance_wallet_rounded, color: AppColors.primary),
                  title: Text(_feeUpiId!, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600)),
                  trailing: IconButton(
                    icon: const Icon(Icons.copy_rounded),
                    onPressed: () => Clipboard.setData(ClipboardData(text: _feeUpiId!)),
                  ),
                ),
              ),
            ],
            if (_adminWhatsApp != null && _adminWhatsApp!.isNotEmpty) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () async {
                  final url = 'https://wa.me/${_adminWhatsApp!.replaceAll(RegExp(r'\D'), '')}';
                  if (await canLaunchUrl(Uri.parse(url))) {
                    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.chat_rounded, size: 20),
                label: const Text('Contact Admin on WhatsApp'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _monthName(int m) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m >= 1 && m <= 12 ? names[m] : 'Month $m';
  }
}
