/**
 * Pluggable logger interface. Library code never calls `console.log`
 * directly — everything goes through this interface. The default logger
 * is silent. Pass a custom implementation to {@link SuperSaas} to enable
 * logging, or use {@link consoleLogger} for ad-hoc debugging.
 *
 * @module
 */

/**
 * Structured logger interface compatible with pino, winston, bunyan, and
 * a plain console fallback.
 *
 * @category Logging
 */
export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

/**
 * No-op logger. The default — production code should not log anything
 * unless the consumer opts in.
 *
 * @category Logging
 */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/**
 * Console-backed logger for debugging. Routes everything through
 * `console.debug/info/warn/error`. Not recommended for production.
 *
 * @category Logging
 */
export const consoleLogger: Logger = {
  debug(message, fields) {
    // eslint-disable-next-line no-console
    console.debug(`[supersaas] ${message}`, fields ?? '');
  },
  info(message, fields) {
    // eslint-disable-next-line no-console
    console.info(`[supersaas] ${message}`, fields ?? '');
  },
  warn(message, fields) {
    console.warn(`[supersaas] ${message}`, fields ?? '');
  },
  error(message, fields) {
    console.error(`[supersaas] ${message}`, fields ?? '');
  },
};
