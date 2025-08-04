/**
 * Error Logger Utility
 * Provides centralized error logging functionality
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface ErrorLogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date(),
      level,
      message,
      error,
      context
    };

    this.logs.push(entry);

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'development') {
      // Map FATAL to error since console.fatal doesn't exist
      const consoleLevel = level === LogLevel.FATAL ? 'error' : level;
      const consoleMethod = console[consoleLevel as keyof Console] as (...args: unknown[]) => void;
      if (typeof consoleMethod === 'function') {
        consoleMethod(message, error, context);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  warn(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, error, context);
  }

  error(message: string, error: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  fatal(message: string, error: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, error, context);
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const errorLogger = ErrorLogger.getInstance();