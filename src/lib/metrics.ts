import {MetricPrisma} from "@/types/dataTypes";
import {convertDateToDateString} from "@lib/dateUtils";

export async function updateMetricClient(metric: MetricPrisma) {
  const res = await fetch("/api/metric", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({...metric, date: convertDateToDateString(metric.date)}),
  });
  if (!res.ok) throw new Error("Failed to update metric");
  return await res.json();
}
