export async function exportPDF(title, content) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const safeTitle = title || "Notulen Rapat";
  const lines = doc.splitTextToSize(content || "", 170);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(safeTitle, 20, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(lines, 20, 35);

  doc.save(`${safeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}

export async function exportDOCX(content) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const paragraphs = String(content || "")
    .split("\\n")
    .map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24,
            }),
          ],
        }),
    );

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notulen-rapat.docx";
  a.click();
  URL.revokeObjectURL(url);
}
