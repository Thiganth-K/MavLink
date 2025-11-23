import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'debug';

// Use a concise single-line format with timestamp and level
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(info => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export default logger;
