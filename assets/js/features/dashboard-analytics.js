import Chart from "chart.js/auto";
import { supabase, getUser } from "../supabase.js";

export async function renderDashboardAnalytics(canvasSelector = "#analyticsChart") {
  const canvas = document.querySelector(canvasSelector);
  if (!canvas) return;

  const user = await getUser();
  if (!user) return;

  const { data } = await supabase
    .from("ai_usage_logs")
    .select("created_at, feature")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const grouped = {};

  (data || []).forEach((row) => {
    const day = new Date(row.created_at).toLocaleDateString("id-ID");
    grouped[day] = (grouped[day] || 0) + 1;
  });

  new Chart(canvas, {
    type: "line",
    data: {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: "AI Usage",
          data: Object.values(grouped),
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" } },
        y: { ticks: { color: "#94a3b8" } },
      },
    },
  });
}
