import { chatService } from "../services/chatService.js";

export function getChatMessage(req) {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) {
    return null;
  }
  return message;
}

export async function chatController(req, res, next) {
  const message = getChatMessage(req);
  if (!message) {
    recordFailure(req.latencyMetrics, null);
    return res.status(400).json({ success: false, error: "message deve conter entre 1 e 2000 caracteres." });
  }
  try {
    const data = await chatService(message, req.latencyMetrics);
    if (req.latencyMetrics) req.latencyMetrics.logical_result = "success";
    return res.json({ success: true, data });
  } catch (error) {
    recordFailure(req.latencyMetrics, error);
    return next(error);
  }
}

export async function chatStreamController(req, res) {
  const message = getChatMessage(req);
  if (!message) {
    recordFailure(req.latencyMetrics, null);
    return res.status(400).json({ success: false, error: "message deve conter entre 1 e 2000 caracteres." });
  }

  const abortController = new AbortController();
  const abortWhenDisconnected = () => {
    if (!res.writableFinished) {
      if (req.latencyMetrics) {
        req.latencyMetrics.logical_result = "cancelled";
        req.latencyMetrics.error_category = "client_cancelled";
      }
      abortController.abort();
    }
  };
  req.once("aborted", abortWhenDisconnected);
  res.once("close", abortWhenDisconnected);
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  if (req.latencyMetrics) req.latencyMetrics.response_bytes = 0;

  try {
    const data = await chatService(message, req.latencyMetrics, {
      signal: abortController.signal,
      onText: (text) => writeStreamEvent(res, req, "chunk", { text }),
      onReset: () => writeStreamEvent(res, req, "reset", {}),
    });
    if (!abortController.signal.aborted) {
      await writeStreamEvent(res, req, "done", { success: true, data });
      if (req.latencyMetrics) req.latencyMetrics.logical_result = "success";
      if (!res.destroyed) res.end();
    }
  } catch (error) {
    if (abortController.signal.aborted || res.destroyed || error?.code === "CLIENT_DISCONNECTED") {
      if (req.latencyMetrics) {
        req.latencyMetrics.logical_result = "cancelled";
        req.latencyMetrics.error_category = "client_cancelled";
      }
      return;
    }
    recordFailure(req.latencyMetrics, error);
    const status = [400, 404, 429, 500, 503].includes(error.status) ? error.status : 500;
    const message =
      status === 400
        ? error.message
        : status === 503
          ? "O serviço Gemini está temporariamente indisponível. Tente novamente em instantes."
          : status === 429
            ? "O limite de solicitações do Gemini foi atingido. Tente novamente em instantes."
            : "Erro interno ao processar a solicitação.";
    try {
      await writeStreamEvent(res, req, "error", { success: false, error: message, status });
      if (!res.destroyed) res.end();
    } catch (writeError) {
      if (req.latencyMetrics && (res.destroyed || writeError?.code === "CLIENT_DISCONNECTED")) {
        req.latencyMetrics.logical_result = "cancelled";
        req.latencyMetrics.error_category = "client_cancelled";
      }
      if (!res.destroyed) res.destroy(writeError);
    }
  } finally {
    req.off("aborted", abortWhenDisconnected);
    res.off("close", abortWhenDisconnected);
  }
}

async function writeStreamEvent(res, req, event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  if (req.latencyMetrics) {
    req.latencyMetrics.response_bytes += Buffer.byteLength(frame, "utf8");
  }
  if (!res.write(frame)) {
    const canContinue = await waitForDrainOrClose(res);
    if (!canContinue) {
      const error = new Error("Cliente encerrou a conexão.");
      error.name = "AbortError";
      error.code = "CLIENT_DISCONNECTED";
      throw error;
    }
  }
  if (res.destroyed) {
    const error = new Error("Cliente encerrou a conexão.");
    error.name = "AbortError";
    error.code = "CLIENT_DISCONNECTED";
    throw error;
  }
}

function recordFailure(metrics, error) {
  if (!metrics) return;
  metrics.logical_result = "failure";
  metrics.error_category = ["gemini_failure", "gemini_timeout"].includes(error?.telemetryCategory)
    ? error.telemetryCategory
    : "application_error";
}

function waitForDrainOrClose(res) {
  return new Promise((resolve) => {
    const cleanup = () => {
      res.off("drain", onDrain);
      res.off("close", onClose);
    };
    const onDrain = () => {
      cleanup();
      resolve(true);
    };
    const onClose = () => {
      cleanup();
      resolve(false);
    };
    res.once("drain", onDrain);
    res.once("close", onClose);
    if (res.destroyed) onClose();
  });
}
