import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  nodeEnv === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
          const meta = metadata as Record<string, unknown> || {};
          const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          const stackStr = stack ? `\n${stack}` : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}${stackStr}`;
        })
      )
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'stxact-proxy',
    environment: nodeEnv,
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

if (nodeEnv !== 'production' && nodeEnv !== 'test') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

logger.info('Logger initialized', { level: logLevel, environment: nodeEnv });


/**
 * Specialized logger context type for strict auditing.
 */
export type AuditLoggerContext = Readonly<{ txid: string; principal: string; timestamp: number; }>;
