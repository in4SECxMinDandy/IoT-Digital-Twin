import mongoose from "mongoose";

import { logger } from "./logger";

// Fail requests promptly while MongoDB is unavailable instead of buffering them indefinitely.
mongoose.set("bufferCommands", false);

let connectionAttemptInFlight = false;

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase(uri: string): Promise<boolean> {
  if (isDatabaseConnected()) {
    return true;
  }

  if (connectionAttemptInFlight) {
    return false;
  }

  connectionAttemptInFlight = true;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
    logger.info("MongoDB connected");
    return true;
  } catch (error) {
    logger.error("MongoDB connection failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return false;
  } finally {
    connectionAttemptInFlight = false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
