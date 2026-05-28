# Publish APK

## Opsi 1: Share APK langsung

Cocok untuk testing internal:
```txt
app-debug.apk
```

Kirim via:
- WhatsApp
- Google Drive
- Telegram
- Website download

User harus aktifkan:
```txt
Install unknown apps
```

## Opsi 2: Google Play Store

Butuh:
- Google Play Developer Account
- biaya sekali bayar
- signed AAB
- privacy policy
- app screenshots
- app icon
- description

## Build Signed AAB

Android Studio:
```txt
Build → Generate Signed Bundle / APK → Android App Bundle
```

Upload:
```txt
app-release.aab
```

## Privacy Policy wajib

Karena app memakai:
- microphone
- login
- audio upload
- AI processing

Buat halaman:
```txt
privacy.html
terms.html
```
