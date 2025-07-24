import {DayMetricPrisma} from "@/types/dataTypes";
import {convertDateToDateString} from "@lib/dateUtils";

export async function updateDayMetricClient(dayMetric: DayMetricPrisma) {
  const res = await fetch("/api/dayMetric", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({...dayMetric, date: convertDateToDateString(dayMetric.date)}),
  });
  if (!res.ok) throw new Error("Failed to update day metric");
  return await res.json();
}
