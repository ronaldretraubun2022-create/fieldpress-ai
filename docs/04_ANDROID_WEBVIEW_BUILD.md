# Build Android WebView APK

Model ini membuka website production dari APK.

## 1. Install dependency

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen
```

## 2. Copy config

Copy `capacitor.config.json` ke root project.

Ganti:

```json
"url": "https://YOUR_DOMAIN_HERE"
```

menjadi:

```json
"url": "https://app.fieldpressai.id"
```

atau Vercel URL:

```json
"url": "https://fieldpress-ai.vercel.app"
```

## 3. Init Android

```bash
npx cap init FieldPressAI com.fieldpress.ai
npx cap add android
npx cap sync android
npx cap open android
```

## 4. Android Permissions

Buka:

```txt
android/app/src/main/AndroidManifest.xml
```

Tambahkan sebelum `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## 5. Build APK

Android Studio:

```txt
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Hasil APK:

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

Untuk production:
```txt
Build → Generate Signed Bundle / APK
```
