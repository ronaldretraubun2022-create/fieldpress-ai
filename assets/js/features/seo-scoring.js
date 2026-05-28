export function scoreSEO({ title = "", lead = "", body = "", keywords = "" }) {
  let score = 0;
  const tips = [];

  if (title.length >= 40 && title.length <= 70) score += 25;
  else tips.push("Judul ideal 40–70 karakter.");

  if (lead.length >= 80 && lead.length <= 180) score += 20;
  else tips.push("Lead ideal 80–180 karakter.");

  if (body.split(/\s+/).length >= 300) score += 25;
  else tips.push("Isi berita sebaiknya minimal 300 kata.");

  const keywordList = keywords.split(",").map((x) => x.trim()).filter(Boolean);
  if (keywordList.length >= 3 && keywordList.length <= 8) score += 20;
  else tips.push("Gunakan 3–8 SEO keywords.");

  if (/[.!?]$/.test(lead.trim())) score += 10;
  else tips.push("Lead sebaiknya ditutup tanda baca.");

  return {
    score,
    grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D",
    tips,
  };
}

export function renderSEOScore(targetSelector, data) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  const result = scoreSEO(data);

  target.innerHTML = `
    <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-black">SEO Score</h3>
        <span class="text-2xl font-black text-cyan-300">${result.score}/100</span>
      </div>
      <p class="mt-1 text-sm text-slate-400">Grade ${result.grade}</p>
      <ul class="mt-4 space-y-2 text-sm text-slate-300">
        ${result.tips.map((tip) => `<li>• ${tip}</li>`).join("") || "<li>SEO sudah bagus.</li>"}
      </ul>
    </div>
  `;
}
