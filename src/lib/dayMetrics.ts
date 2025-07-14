// File: lib/api/dayMetrics.ts
import { DayMetricPrisma } from "@/types/dataTypes";

export async function updateDayMetricClient(dayMetric: DayMetricPrisma) {
  const res = await fetch("/api/dayMetric", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dayMetric),
  });
  if (!res.ok) throw new Error("Failed to update day metric");
  return await res.json();
}
