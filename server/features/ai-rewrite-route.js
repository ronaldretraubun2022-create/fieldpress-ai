/*
Paste this route into server/server.js before app.listen(...)

Requires existing:
- app
- auth
- checkQuota
- chatJSON
- logUsage
*/

app.post("/api/ai/rewrite", auth, async (req, res) => {
  try {
    await checkQuota(req.user.id, req.profile);

    const text = String(req.body.text || "").trim();
    const instruction = String(req.body.instruction || "Rapikan teks.").trim();
    const level = String(req.body.level || "clean").trim();

    if (!text) {
      return res.status(400).json({ error: "Teks kosong." });
    }

    const { json, tokens } = await chatJSON([
      {
        role: "system",
        content: `Return JSON {"text":"..."} only. ${instruction} Jangan mengarang fakta baru.`,
      },
      {
        role: "user",
        content: text,
      },
    ]);

    await logUsage(req.user.id, `rewrite_${level}`, tokens);

    res.json(json);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
