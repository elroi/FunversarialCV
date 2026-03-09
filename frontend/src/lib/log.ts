type LogLevel = "info" | "error";

interface LogPayload {
  level: LogLevel;
  route: string;
  event: string;
  message?: string;
  meta?: Record<string, unknown>;
}

function emit(payload: LogPayload) {
  const line = JSON.stringify(payload);
  if (payload.level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logInfo(route: string, event: string, meta?: Record<string, unknown>) {
  emit({ level: "info", route, event, meta });
}

export function logError(
  route: string,
  event: string,
  message?: string,
  meta?: Record<string, unknown>
) {
  emit({ level: "error", route, event, message, meta });
}

