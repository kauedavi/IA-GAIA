import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
let lastRequestFinishedAt = null;
let activeRequestCount = 0;

export function latencyMetrics(req, res, next) {
  const startedAt = performance.now();
  const idleGapMs =
    lastRequestFinishedAt === null ? null : Math.round(startedAt - lastRequestFinishedAt);
  const activity =
    activeRequestCount > 0
      ? "concurrent"
      : idleGapMs === null
        ? "first"
        : idleGapMs >= IDLE_THRESHOLD_MS
          ? "idle"
          : "active";
  const metrics = {
    request_id: randomUUID(),
    service_activity: activity,
    idle_gap_ms: idleGapMs,
    rounds: 0,
    gemini_attempts: 0,
    gemini_retries: 0,
    gemini_failures: 0,
    gemini_duration_ms: 0,
    gemini_retry_delay_ms: 0,
    gemini_calls: [],
    tool_duration_ms: 0,
    tool_response_bytes: 0,
    models_used: [],
    selected_model: null,
    fallback_attempted: false,
    fallback_used: false,
    tools_called: [],
    schedule_cache_hits: 0,
    schedule_cache_misses: 0,
    schedule_cache_hit_duration_ms: 0,
    schedule_cache_miss_duration_ms: 0,
    response_bytes: null,
  };
  activeRequestCount += 1;
  req.latencyMetrics = metrics;

  const originalJson = res.json;
  res.json = function sendJson(body) {
    const serialized = JSON.stringify(body);
    metrics.response_bytes = Buffer.byteLength(serialized || "", "utf8");
    return originalJson.call(this, body);
  };

  let recorded = false;
  const recordCompletion = () => {
    if (recorded) return;
    recorded = true;
    activeRequestCount -= 1;
    lastRequestFinishedAt = performance.now();
    console.log(
      JSON.stringify({
        event: "api_latency",
        method: req.method,
        route: `${req.baseUrl}${req.path}`,
        status: res.statusCode,
        duration_ms: Math.round(performance.now() - startedAt),
        ...metrics,
      })
    );
  };
  res.once("finish", recordCompletion);
  res.once("close", recordCompletion);

  next();
}
