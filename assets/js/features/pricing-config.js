export const WHATSAPP_NUMBER = "6282121167987";

export const PRICING_PLANS = [
  {
    code: "free",
    name: "Free",
    price: "Rp0",
    priceIdr: 0,
    description: "Untuk mencoba FieldPress AI.",
    features: [
      "3 AI generate per hari",
      "3 menit audio per hari",
      "Mode Wartawan demo",
      "Mode Notulen demo",
      "Watermark export",
    ],
  },
  {
    code: "basic",
    name: "Basic",
    price: "Rp99rb/bln",
    priceIdr: 99000,
    description: "Untuk kreator dan wartawan freelance.",
    features: [
      "100 AI generate per bulan",
      "180 menit audio per bulan",
      "Export PDF/DOCX",
      "Top up jika quota habis",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: "Rp299rb/bln",
    priceIdr: 299000,
    description: "Untuk reporter aktif dan newsroom kecil.",
    features: [
      "500 AI generate per bulan",
      "1.200 menit audio per bulan",
      "CMS publish",
      "Realtime collaboration",
      "SEO scoring",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    priceIdr: 0,
    description: "Untuk media, instansi, dan tim besar.",
    features: [
      "Custom quota",
      "Dedicated support",
      "Admin dashboard",
      "Team collaboration",
      "Custom deployment",
    ],
  },
];

export const TOPUP_PACKAGES = [
  {
    code: "topup_50",
    name: "+50 AI Generate",
    price: "Rp29rb",
    priceIdr: 29000,
    extraGenerates: 50,
    extraAudioMinutes: 0,
  },
  {
    code: "topup_100",
    name: "+100 AI Generate",
    price: "Rp49rb",
    priceIdr: 49000,
    extraGenerates: 100,
    extraAudioMinutes: 0,
  },
  {
    code: "topup_audio_5h",
    name: "+5 Jam Audio",
    price: "Rp39rb",
    priceIdr: 39000,
    extraGenerates: 0,
    extraAudioMinutes: 300,
  },
];

export function whatsappLink(message) {
  const number = WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
