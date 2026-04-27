export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: Record<string, unknown>;
}

export function buildLogEntry(level: LogLevel, message: string, fields?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    fields,
  };
}

export function serializeLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}
