import { Response } from 'express';
import {
  sendError,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendInternalError,
} from '../../src/api/error-responses';

function makeRes() {
  let statusCode = 0;
  const body: Record<string, unknown> = {};
  const res = {
    status(s: number) {
      statusCode = s;
      return this;
    },
    json(payload: Record<string, unknown>) {
      Object.assign(body, payload);
      return this;
    },
  } as unknown as Response;
  return { res, body, get status() { return statusCode; } };
}

describe('error responses', () => {
  it('sendError sets status and body', () => {
    const ctx = makeRes();
    sendError(ctx.res, 418, 'teapot', 'short and stout');
    expect(ctx.body.status).toBe(418);
    expect(ctx.body.error).toBe('teapot');
    expect(ctx.body.message).toBe('short and stout');
  });

  it('sendNotFound returns 404', () => {
    const ctx = makeRes();
    sendNotFound(ctx.res);
    expect(ctx.body.status).toBe(404);
    expect(ctx.body.error).toBe('not_found');
  });

  it('sendBadRequest passes details', () => {
    const ctx = makeRes();
    sendBadRequest(ctx.res, 'invalid input', { field: 'x' });
    expect(ctx.body.status).toBe(400);
    expect(ctx.body.details).toEqual({ field: 'x' });
  });

  it('sendUnauthorized returns 401', () => {
    const ctx = makeRes();
    sendUnauthorized(ctx.res);
    expect(ctx.body.status).toBe(401);
  });

  it('sendInternalError returns 500', () => {
    const ctx = makeRes();
    sendInternalError(ctx.res);
    expect(ctx.body.status).toBe(500);
  });
});
