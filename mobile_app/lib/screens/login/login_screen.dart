import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/config.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _auth = AuthService();
  bool _isParent = true;
  bool _loading = false;
  String? _error;

  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _apiUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadApiUrl();
  }

  Future<void> _loadApiUrl() async {
    final url = await ApiConfig.getBaseUrl();
    if (mounted) _apiUrlController.text = url;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _apiUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final apiUrl = _apiUrlController.text.trim();
      if (apiUrl.isNotEmpty) {
        await ApiConfig.setBaseUrl(apiUrl);
      }
      if (_isParent) {
        final phone = _phoneController.text.trim();
        if (phone.isEmpty) throw Exception('Enter phone number');
        await _auth.loginParent(phone);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/parent');
      } else {
        final email = _emailController.text.trim();
        final password = _passwordController.text;
        if (email.isEmpty || password.isEmpty) throw Exception('Enter email and password');
        await _auth.loginTeacher(email, password);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/teacher');
      }
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Text(
                  'School ERP',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Welcome back',
                  style: GoogleFonts.sourceSans3(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 40),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      _buildToggleTab('Parent', _isParent),
                      _buildToggleTab('Teacher', !_isParent),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Server URL (for physical device, use PC IP)',
                  style: GoogleFonts.sourceSans3(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _apiUrlController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    hintText: 'https://school-erp-api.onrender.com',
                    prefixIcon: Icon(Icons.link, color: AppColors.primary, size: 20),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: GoogleFonts.sourceSans3(
                        fontSize: 14,
                        color: Colors.red.shade800,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                if (_isParent) ...[
                  Text(
                    'Phone number',
                    style: GoogleFonts.sourceSans3(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      hintText: '10 digits, e.g. 8116296268',
                      prefixIcon: Icon(Icons.phone_outlined, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Continue'),
                    ),
                  ),
                ] else ...[
                  Text(
                    'Email',
                    style: GoogleFonts.sourceSans3(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'Enter your email',
                      prefixIcon: Icon(Icons.email_outlined, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Password',
                    style: GoogleFonts.sourceSans3(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      hintText: 'Enter your password',
                      prefixIcon: Icon(Icons.lock_outline, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign in'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildToggleTab(String label, bool isSelected) {
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() {
          _isParent = label == 'Parent';
          _error = null;
        }),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.sourceSans3(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
