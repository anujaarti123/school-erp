# Build & Install APK on Device

## Fix: "Timeout waiting to lock build logic queue"
If you see this error, another Gradle process is holding the lock. Fix it:

```powershell
# Kill Gradle/Java processes
taskkill /F /IM java.exe 2>nul
taskkill /F /IM gradle.exe 2>nul

# Remove Gradle lock (in mobile_app folder)
Remove-Item -Recurse -Force android\.gradle

# Then rebuild
flutter build apk
```

## Prerequisites
- Flutter SDK installed
- Android device connected via USB with **USB debugging** enabled
- Device authorized (accept the "Allow USB debugging" prompt on device)

## Steps

### 1. Connect device
Connect your Android phone via USB. Enable **Developer options** → **USB debugging**.

### 2. Verify device
```powershell
cd "d:\SCHOOL ERP\mobile_app"
flutter devices
```
You should see your device listed (e.g. CPH2373).

### 3. Build APK
```powershell
flutter build apk
```
First build may take 5–10 minutes (Gradle downloads). Output:
```
build\app\outputs\flutter-apk\app-release.apk
```

### 4. Install on connected device
```powershell
flutter install
```
Or install the APK directly:
```powershell
adb install build\app\outputs\flutter-apk\app-release.apk
```

### 5. Run in debug (alternative)
```powershell
flutter run
```
Runs on the connected device without building a release APK.

## API URL (important for physical device)
- **Emulator:** `10.0.2.2:4000` (default)
- **Physical device:** Use your PC's LAN IP, e.g. `http://192.168.1.5:4000`

Build with custom API URL:
```powershell
flutter build apk --dart-define=API_URL=http://YOUR_PC_IP:4000
```

Ensure the backend is running and reachable from the device (same Wi‑Fi network).
