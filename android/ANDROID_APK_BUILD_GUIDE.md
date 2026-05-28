# FieldPress AI Android APK Build

## Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## Initialize
```bash
npx cap init FieldPressAI com.fieldpress.ai
```

## Add Android
```bash
npx cap add android
```

## Build Web
```bash
npm run build
```

## Copy Web Build
```bash
npx cap copy android
```

## Open Android Studio
```bash
npx cap open android
```

## Build APK
Android Studio:
Build → Build Bundle(s) / APK(s) → Build APK(s)

## Important
For production:
- Use HTTPS deployed frontend.
- Set API URL to production backend.
- Add Android permissions for microphone and storage.
