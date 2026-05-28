# Splash Screen + Icon Guide

## Icon

Siapkan icon:

```txt
1024x1024 PNG
```

Nama:
```txt
icon.png
```

Gunakan tools:
- Android Studio Image Asset
- Canva
- Figma
- Icon Kitchen

## Android Studio

1. Open Android Studio
2. Klik kanan `app`
3. New → Image Asset
4. Foreground Layer: pilih `icon.png`
5. Background: `#020617`
6. Generate

## Splash

Warna:
```txt
#020617
```

Logo:
```txt
FieldPress AI / FP
```

Kalau pakai Capacitor Splash Screen:

```bash
npm install @capacitor/splash-screen
npx cap sync android
```

## Rekomendasi Brand

- Background: dark navy `#020617`
- Accent: cyan `#22d3ee`
- Logo text: FP
- Style: AI newsroom cyber blue
