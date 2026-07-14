import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'jasmine@edara.com.eg');
  final _password = TextEditingController(text: 'Password123!');
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() { _busy = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _password.text);
    } catch (e) {
      setState(() => _error = e.toString());
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.4,
            colors: [Color(0xFF0F2540), Color(0xFF0E1218)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(
                      gradient: AppColors.gradient,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: AppColors.emerald.withOpacity(0.35), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 12),
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                      children: [
                        TextSpan(text: 'E', style: TextStyle(color: AppColors.emerald)),
                        TextSpan(text: 'Teams', style: TextStyle(color: AppColors.text)),
                      ],
                    ),
                  ),
                  const Text('EDARA · A SODIC Company',
                    style: TextStyle(color: AppColors.textDim, fontSize: 11, letterSpacing: 2)),
                  const SizedBox(height: 32),
                  const Text('Sign in to your workspace',
                    style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.panel,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(labelText: 'Work email'),
                          style: const TextStyle(color: AppColors.text),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          decoration: const InputDecoration(labelText: 'Password'),
                          style: const TextStyle(color: AppColors.text),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withOpacity(0.1),
                              border: Border.all(color: AppColors.danger),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
                          ),
                        ],
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: Material(
                            borderRadius: BorderRadius.circular(10),
                            child: Ink(
                              decoration: BoxDecoration(
                                gradient: AppColors.gradient,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: _busy ? null : _submit,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  alignment: Alignment.center,
                                  child: _busy
                                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Sign In', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
