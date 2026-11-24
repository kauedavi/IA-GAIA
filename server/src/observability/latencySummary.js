function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.ceil(percentileValue * sorted.length) - 1];
}

function percentage(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function summarizeGroup(records) {
  const errors = records.filter((record) => record.status >= 400).length;
  const fallbackAttempts = records.filter((record) => record.fallback_attempted).length;
  const fallbackSuccesses = records.filter((record) => record.fallback_used).length;
  const geminiAttempts = records.reduce(
    (total, record) => total + (Number.isFinite(record.gemini_attempts) ? record.gemini_attempts : 0),
    0
  );
  const totalDurations = records
    .map((record) => record.duration_ms)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const geminiDurations = records
    .map((record) => record.gemini_duration_ms)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);

  return {
    requests: records.length,
    errors,
    error_rate_percent: percentage(errors, records.length),
    fallback_attempts: fallbackAttempts,
    fallback_attempt_rate_percent: percentage(fallbackAttempts, records.length),
    fallback_successes: fallbackSuccesses,
    fallback_success_rate_percent: percentage(fallbackSuccesses, records.length),
    mean_gemini_attempts: Math.round((geminiAttempts / records.length) * 100) / 100,
    duration_ms: {
      p50: percentile(totalDurations, 0.5),
      p95: percentile(totalDurations, 0.95),
    },
    gemini_duration_ms: {
      p50: percentile(geminiDurations, 0.5),
      p95: percentile(geminiDurations, 0.95),
    },
  };
}

export function summarizeLatencyRecords(records) {
  const samples = records.filter(
    (record) =>
      record?.event === "api_latency" &&
      Number.isFinite(record.duration_ms) &&
      record.duration_ms >= 0
  );
  if (!samples.length) {
    throw new Error("Nenhum registro api_latency válido foi encontrado.");
  }

  const groups = new Map();
  for (const record of samples) {
    const activity = record.service_activity || "unknown";
    if (!groups.has(activity)) groups.set(activity, []);
    groups.get(activity).push(record);
  }

  return {
    percentile_method: "nearest_rank",
    overall: summarizeGroup(samples),
    by_service_activity: Object.fromEntries(
      [...groups].map(([activity, group]) => [activity, summarizeGroup(group)])
    ),
  };
}
