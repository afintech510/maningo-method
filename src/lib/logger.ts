import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
