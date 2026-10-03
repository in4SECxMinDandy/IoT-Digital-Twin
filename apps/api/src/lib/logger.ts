type Metadata = Record<string, unknown>;

function write(level: "INFO" | "WARN" | "ERROR", message: string, metadata?: Metadata): void {
  const suffix = metadata ? ` ${JSON.stringify(metadata)}` : "";
  const output = `[${new Date().toISOString()}] ${level} ${message}${suffix}`;

  if (level === "ERROR") {
    console.error(output);
    return;
  }

  if (level === "WARN") {
    console.warn(output);
    return;
  }

  console.info(output);
}

export const logger = {
  info: (message: string, metadata?: Metadata) => write("INFO", message, metadata),
  warn: (message: string, metadata?: Metadata) => write("WARN", message, metadata),
  error: (message: string, metadata?: Metadata) => write("ERROR", message, metadata)
};
