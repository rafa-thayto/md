import { describe, test, expect } from 'bun:test';
import { parseArgs } from '../cli';

describe('parseArgs', () => {
  test('defaults when no args', () => {
    const args = parseArgs([]);
    expect(args.port).toBe(3456);
    expect(args.openBrowser).toBe(true);
    expect(args.help).toBe(false);
    expect(args.rootPath).toBe(process.cwd());
  });

  test('--help and -h', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  test('--no-open', () => {
    expect(parseArgs(['--no-open']).openBrowser).toBe(false);
  });

  test('--port forms', () => {
    expect(parseArgs(['--port', '4000']).port).toBe(4000);
    expect(parseArgs(['-p', '4000']).port).toBe(4000);
    expect(parseArgs(['--port=4000']).port).toBe(4000);
  });

  test('rejects invalid ports', () => {
    expect(() => parseArgs(['--port', '0'])).toThrow();
    expect(() => parseArgs(['--port', '-1'])).toThrow();
    expect(() => parseArgs(['--port', '99999'])).toThrow();
    expect(() => parseArgs(['--port', 'abc'])).toThrow();
  });

  test('rejects unknown options', () => {
    expect(() => parseArgs(['--unknown'])).toThrow();
  });

  test('rejects multiple positional args', () => {
    expect(() => parseArgs(['a', 'b'])).toThrow();
  });

  test('positional path is resolved to absolute', () => {
    const args = parseArgs(['./docs']);
    expect(args.rootPath.startsWith('/')).toBe(true);
    expect(args.rootPath.endsWith('/docs')).toBe(true);
  });

  test('absolute positional path is preserved', () => {
    const args = parseArgs(['/tmp/docs']);
    expect(args.rootPath).toBe('/tmp/docs');
  });
});
