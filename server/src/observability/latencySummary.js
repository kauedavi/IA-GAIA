function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.ceil(percentileValue * sorted.length) - 1];
}

function percentage(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function summarizeGroup(records) {
  const errors = records.filter((record) => {
    if (record.logical_result === "failure") return true;
    if (record.logical_result === "success" || record.logical_result === "cancelled") return false;
    return (record.http_status ?? record.status) >= 400;
  }).length;
  const cancelledRequests = records.filter((record) => record.logical_result === "cancelled").length;
  const fallbackAttempts = records.filter((record) => record.fallback_attempted).length;
  const fallbackSuccesses = records.filter((record) => record.fallback_used).length;
  const geminiAttempts = records.reduce(
    (total, record) => total + (Number.isFinite(record.gemini_attempts) ? record.gemini_attempts : 0),
    0
  );
  const toolResponseBytes = records.reduce(
    (total, record) =>
      total + (Number.isFinite(record.tool_response_bytes) ? record.tool_response_bytes : 0),
    0
  );
  const totalDurations = records
    .map((record) => record.duration_ms)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const geminiDurations = records
    .map((record) => record.gemini_duration_ms)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const responseSizes = records
    .map((record) => record.response_bytes)
    .filter((size) => Number.isFinite(size) && size >= 0);
  const scheduleCacheHits = records.reduce(
    (total, record) => total + (Number.isFinite(record.schedule_cache_hits) ? record.schedule_cache_hits : 0),
    0
  );
  const scheduleCacheMisses = records.reduce(
    (total, record) => total + (Number.isFinite(record.schedule_cache_misses) ? record.schedule_cache_misses : 0),
    0
  );
  const scheduleCacheHitDuration = records.reduce(
    (total, record) =>
      total + (Number.isFinite(record.schedule_cache_hit_duration_ms) ? record.schedule_cache_hit_duration_ms : 0),
    0
  );
  const scheduleCacheMissDuration = records.reduce(
    (total, record) =>
      total + (Number.isFinite(record.schedule_cache_miss_duration_ms) ? record.schedule_cache_miss_duration_ms : 0),
    0
  );
  const scheduleCacheQueries = scheduleCacheHits + scheduleCacheMisses;

  return {
    requests: records.length,
    errors,
    cancelled_requests: cancelledRequests,
    error_rate_percent: percentage(errors, records.length),
    fallback_attempts: fallbackAttempts,
    fallback_attempt_rate_percent: percentage(fallbackAttempts, records.length),
    fallback_successes: fallbackSuccesses,
    fallback_success_rate_percent: percentage(fallbackSuccesses, records.length),
    mean_gemini_attempts: Math.round((geminiAttempts / records.length) * 100) / 100,
    mean_tool_response_bytes: Math.round((toolResponseBytes / records.length) * 100) / 100,
    schedule_cache: {
      hits: scheduleCacheHits,
      misses: scheduleCacheMisses,
      hit_rate_percent: percentage(scheduleCacheHits, scheduleCacheQueries),
      hit_duration_ms_mean: scheduleCacheHits
        ? Math.round((scheduleCacheHitDuration / scheduleCacheHits) * 1000) / 1000
        : null,
      miss_duration_ms_mean: scheduleCacheMisses
        ? Math.round((scheduleCacheMissDuration / scheduleCacheMisses) * 1000) / 1000
        : null,
    },
    duration_ms: {
      p50: percentile(totalDurations, 0.5),
      p95: percentile(totalDurations, 0.95),
    },
    response_bytes: {
      mean: responseSizes.length
        ? Math.round(
            (responseSizes.reduce((total, size) => total + size, 0) / responseSizes.length) * 100
          ) / 100
        : null,
      p50: percentile(responseSizes, 0.5),
      p95: percentile(responseSizes, 0.95),
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
