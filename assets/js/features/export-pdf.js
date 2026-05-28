import { jsPDF } from "jspdf";

export function buildMeetingContent() {
  return {
    title: document.querySelector("#meetingTitle")?.value || "Notulen Rapat",
    date: document.querySelector("#meetingDate")?.value || "-",
    participants: document.querySelector("#participants")?.value || "-",
    summary: document.querySelector("#summary")?.value || "-",
    decisions: document.querySelector("#decisions")?.value || "-",
    actionItems: document.querySelector("#actionItems")?.value || "-",
  };
}

export function exportMeetingPDF() {
  const data = buildMeetingContent();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = 18;
  const margin = 16;
  const width = 178;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.title, margin, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Tanggal: ${data.date}`, margin, y);

  y += 8;
  doc.text(`Peserta: ${data.participants}`, margin, y, { maxWidth: width });

  const sections = [
    ["Ringkasan", data.summary],
    ["Keputusan", data.decisions],
    ["Action Items", data.actionItems],
  ];

  sections.forEach(([heading, body]) => {
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(heading, margin, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(body, width);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += 6;
    });
  });

  doc.save(`${data.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}
