import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
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
  List<String> _sessions = [];
  String? _feeUpiId;
  String? _adminWhatsApp;
  bool _loading = true;
  String? _error;

  String _session = '';
  int? _month;
  String _status = 'all';

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
      final data = await _api.getFeesMyChildren(
        session: _session.isNotEmpty ? _session : null,
        month: _month,
        status: _status != 'all' ? _status : null,
      );
      if (!mounted) return;
      final sessions = data['sessions'] as List<dynamic>? ?? [];
      setState(() {
        _children = data['children'] as List<dynamic>? ?? [];
        _sessions = sessions.map((s) => s.toString()).toList();
        if (_sessions.isNotEmpty && _session.isEmpty) _session = _sessions.last;
        _feeUpiId = data['feeUpiId'] as String?;
        _adminWhatsApp = data['adminWhatsApp'] as String?;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString();
      final friendly = msg.contains('TimeoutException') || msg.contains('Timeout')
          ? 'Connection timed out. Please check your internet and retry.'
          : msg.replaceFirst('Exception: ', '');
      setState(() {
        _error = friendly;
        _loading = false;
      });
    }
  }

  void _applyFilters() {
    _load();
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
            _buildFilters(),
            const SizedBox(height: 16),
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
              Text('Fee History', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ...fees.map((f) {
                final m = f['month'] as int? ?? 0;
                final y = f['year'] as int? ?? 0;
                final due = (f['dueAmount'] as num?)?.toDouble() ?? 0;
                final paid = (f['paidAmount'] as num?)?.toDouble() ?? 0;
                final status = (f['status'] as String?) ?? '';
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
                        if (status.isNotEmpty) Text(status, style: GoogleFonts.sourceSans3(fontSize: 10, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                );
              }),
            ] else ...[
              Text('Fee History', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Card(
                color: Colors.grey.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No fees for selected filters',
                      style: GoogleFonts.sourceSans3(fontSize: 14, color: AppColors.textSecondary),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            if (_feeUpiId != null && _feeUpiId!.isNotEmpty) ...[
              Text('Pay via UPI', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
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
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: () => _openUpiApp(childDue),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                        ),
                        child: QrImageView(
                          data: _upiDeepLink(childDue),
                          version: QrVersions.auto,
                          size: 140,
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text('Scan QR or tap below', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => _openUpiApp(childDue),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.account_balance_wallet_rounded, color: AppColors.primary, size: 22),
                          const SizedBox(width: 8),
                          Text(_feeUpiId!, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.primary)),
                          const SizedBox(width: 8),
                          Icon(Icons.open_in_new_rounded, size: 18, color: AppColors.textSecondary),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    GestureDetector(
                      onTap: () => Clipboard.setData(ClipboardData(text: _feeUpiId!)),
                      child: Text('Tap to copy UPI ID', style: GoogleFonts.sourceSans3(fontSize: 11, color: AppColors.textSecondary)),
                    ),
                  ],
                ),
              ),
            ],
            if (_adminWhatsApp != null && _adminWhatsApp!.isNotEmpty) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _openWhatsAppIHavePaid(name, childDue),
                  icon: const Icon(Icons.chat_rounded, size: 22),
                  label: const Text('I have paid (WhatsApp)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _monthLabel() {
    if (_month == null) return 'All';
    const names = {4: 'Apr', 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec', 1: 'Jan', 2: 'Feb', 3: 'Mar'};
    return names[_month] ?? 'All';
  }

  Widget _buildFilters() {
    const months = ['All', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const monthValues = [null, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Filters', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          if (_sessions.isNotEmpty) ...[
            Text('Session', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            DropdownButtonFormField<String>(
              value: _session.isNotEmpty ? _session : _sessions.last,
              decoration: InputDecoration(
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              items: _sessions.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) {
                setState(() => _session = v ?? _sessions.last);
                _applyFilters();
              },
            ),
            const SizedBox(height: 12),
          ],
          Text('Month', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            value: _monthLabel(),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: months.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
            onChanged: (v) {
              final idx = months.indexOf(v ?? 'All');
              setState(() => _month = idx >= 0 && idx < monthValues.length ? monthValues[idx] : null);
              _applyFilters();
            },
          ),
          const SizedBox(height: 12),
          Text('Status', style: GoogleFonts.sourceSans3(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            value: _status,
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('All')),
              DropdownMenuItem(value: 'pending', child: Text('Pending')),
              DropdownMenuItem(value: 'paid', child: Text('Paid')),
              DropdownMenuItem(value: 'partial', child: Text('Partial')),
            ],
            onChanged: (v) {
              setState(() => _status = v ?? 'all');
              _applyFilters();
            },
          ),
        ],
      ),
    );
  }

  String _monthName(int m) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m >= 1 && m <= 12 ? names[m] : 'Month $m';
  }

  String _upiDeepLink(double amount) {
    final upi = Uri.encodeComponent(_feeUpiId ?? '');
    return 'upi://pay?pa=$upi&pn=${Uri.encodeComponent('Sutara Mehi School')}&am=${amount.toStringAsFixed(0)}&cu=INR';
  }

  Future<void> _openUpiApp(double amount) async {
    try {
      final uri = Uri.parse(_upiDeepLink(amount));
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open UPI app. Please copy UPI ID and pay manually.')),
        );
      }
    }
  }

  Future<void> _openWhatsAppIHavePaid(String studentName, double amount) async {
    final num = (_adminWhatsApp ?? '').replaceAll(RegExp(r'\D'), '');
    if (num.isEmpty) return;
    final phone = num.length == 10 ? '91$num' : num;
    final msg = Uri.encodeComponent(
      'I have paid ₹${amount.toStringAsFixed(0)} for $studentName. Please confirm receipt.\n\n- SMMS Kursela',
    );
    try {
      final uri = Uri.parse('https://wa.me/$phone?text=$msg');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open WhatsApp. Please install WhatsApp.')),
        );
      }
    }
  }
}
