# Run Flutter Web (Chrome) — If stuck on "Loading..."

## 1. Stop any running Flutter process
Press **Ctrl+C** in the terminal where Flutter is running.

## 2. Clean and rebuild
```cmd
cd /d "D:\SCHOOL ERP\mobile_app"
flutter clean
flutter pub get
flutter run -d chrome
```

## 3. Wait for "Compiling" to finish
- Look for **"Compiling lib\main.dart for the Web..."** in the terminal
- Wait until you see **"Flutter run key commands"** (no red errors)
- Only then should the browser show the login screen

## 4. If still stuck, try CanvasKit renderer
```cmd
flutter run -d chrome --web-renderer canvaskit
```

## 5. Check terminal for errors
- If you see red text like `CardTheme` or `card_theme.dart`, the build failed
- The browser will show "Loading..." but the app never loads
- Fix any compile errors first, then run again
