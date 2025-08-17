import pino from 'pino';

// Create the logger instance
const logger = pino({
  // Use pretty printing in development
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : {
        targets: [
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              messageFormat: '{msg} [ctx:{reqId}]',
            },
          },
          {
            target: 'pino/file',
            level: 'error',
            options: { destination: './logs/errors.log' },
          },
        ],
      },

  // Set log level based on environment or fallback to debug
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Add useful metadata
  mixin: () => ({
    service: 'our-heritage-api',
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  }),

  // Hide sensitive data in logs
  redact: {
    paths: [
      'password',
      '*.password',
      '*.token',
      '*.authorization',
      'req.headers.authorization',
    ],
    censor: '**REDACTED**',
  },

  // Format timestamps as ISO strings
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Standard error/req/res serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Utility to create contextual loggers
export const createChildLogger = (context: Record<string, unknown>) =>
  logger.child(context);

export default logger;
