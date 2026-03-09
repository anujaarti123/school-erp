import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'screens/splash/splash_screen.dart';
import 'screens/login/login_screen.dart';
import 'screens/parent/parent_dashboard.dart';
import 'screens/parent/homework_list_screen.dart';
import 'screens/parent/bus_screen.dart';
import 'screens/parent/fees_screen.dart';
import 'screens/teacher/teacher_dashboard.dart';
import 'screens/teacher/post_homework_screen.dart';
import 'screens/teacher/class_list_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Color(0xFFF8FAFC),
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const SchoolErpApp());
}

class SchoolErpApp extends StatelessWidget {
  const SchoolErpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sutara Mehi Mission School',
      debugShowCheckedModeBanner: false,
      theme: appTheme,
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/': (context) => const LoginScreen(),
        '/parent': (context) => const ParentDashboard(),
        '/parent/homework': (context) => const HomeworkListScreen(),
        '/parent/bus': (context) => const BusScreen(),
        '/parent/fees': (context) => const FeesScreen(),
        '/teacher': (context) => const TeacherDashboard(),
        '/teacher/post-homework': (context) => const PostHomeworkScreen(),
        '/teacher/class-list': (context) => const ClassListScreen(),
      },
    );
  }
}
