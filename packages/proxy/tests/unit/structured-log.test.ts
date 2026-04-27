import { buildLogEntry, serializeLogEntry } from '../../src/utils/structured-log';

describe('structured-log', () => {
  it('builds entry with all fields', () => {
    const entry = buildLogEntry('info', 'hello', { req: 'abc' });
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('hello');
    expect(entry.fields?.req).toBe('abc');
    expect(entry.timestamp).toMatch(/T.*Z$/);
  });

  it('builds entry without fields', () => {
    const entry = buildLogEntry('error', 'boom');
    expect(entry.fields).toBeUndefined();
  });

  it('serialize is valid JSON', () => {
    const out = serializeLogEntry(buildLogEntry('warn', 'careful'));
    expect(() => JSON.parse(out)).not.toThrow();
  });
});
