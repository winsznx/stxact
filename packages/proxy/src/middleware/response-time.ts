import { Request, Response, NextFunction } from 'express';

export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    res.setHeader('x-response-time', `${durationMs.toFixed(2)}ms`);
  });
  next();
}
