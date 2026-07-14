import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'providers/auth_provider.dart';
import 'providers/channels_provider.dart';
import 'screens/login_screen.dart';
import 'screens/workspace_screen.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try { await dotenv.load(fileName: '.env'); } catch (_) {}
  runApp(const ETeamsApp());
}

class ETeamsApp extends StatelessWidget {
  const ETeamsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..restore()),
        ChangeNotifierProvider(create: (_) => ChannelsProvider()),
      ],
      child: MaterialApp(
        title: 'ETeams',
        debugShowCheckedModeBanner: false,
        theme: appTheme(),
        home: const _Root(),
      ),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) {
      return const Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(child: CircularProgressIndicator(color: AppColors.emerald)),
      );
    }
    return auth.isAuthenticated ? const WorkspaceScreen() : const LoginScreen();
  }
}
