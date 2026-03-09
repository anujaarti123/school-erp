# Fix Android Build — libs.jar / checkDebugDuplicateClasses Error

## Step 1: Full clean (copy-paste all)

```cmd
cd /d "D:\SCHOOL ERP\mobile_app"
flutter clean
rd /s /q build 2>nul
rd /s /q android\build 2>nul
rd /s /q android\app\build 2>nul
rd /s /q android\.gradle 2>nul
flutter pub get
```

## Step 2: Run again

```cmd
flutter run
```

## Step 3: If still fails — clear Gradle cache

```cmd
cd /d "D:\SCHOOL ERP\mobile_app\android"
gradlew clean
cd ..
flutter run
```

## Step 4: Nuclear option — delete user Gradle cache

Close all terminals, then:
1. Delete folder: `C:\Users\ANKU\.gradle\caches`
2. Run `flutter run` again (will re-download, takes longer)
