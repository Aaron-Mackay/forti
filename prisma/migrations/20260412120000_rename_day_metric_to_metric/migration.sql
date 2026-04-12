-- Rename the DayMetric table to Metric
ALTER TABLE "DayMetric" RENAME TO "Metric";

-- Rename constraints and indexes to match the new model name
ALTER TABLE "Metric" RENAME CONSTRAINT "DayMetric_pkey" TO "Metric_pkey";
ALTER TABLE "Metric" RENAME CONSTRAINT "DayMetric_userId_fkey" TO "Metric_userId_fkey";
ALTER INDEX "DayMetric_userId_date_key" RENAME TO "Metric_userId_date_key";
