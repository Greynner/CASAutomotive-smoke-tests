import { describe, expect, test } from 'bun:test';
import { moneyToCents } from '../../src/e2e-tests/support/marketplace.js';

test('rejects a truncated decimal rather than silently reading its integer prefix', () => {
  expect(() => moneyToCents('$12.3')).toThrow();
});

test('preserves exact cents for large amounts still within the safe integer range', () => {
  expect(moneyToCents('$70368744177664.01')).toBe(7036874417766401);
});

test('rejects amounts that cannot be represented safely as integer cents', () => {
  expect(() => moneyToCents('$90071992547409.92')).toThrow();
});

describe('displayed USD price parsing', () => {
  test.each([
    ['$0.00', 0],
    ['$0.01', 1],
    ['$19.99', 1999],
    ['$109', 10900],
    ['$1,234.56', 123456],
    ['$1,234,567.89', 123456789],
    ['$90071992547409.91', Number.MAX_SAFE_INTEGER],
    ['Price: $50.00 each', 5000],
    ['$149.99 $199.99', 14999],
  ])('converts %s to integer cents', (text, expected) => {
    expect(moneyToCents(text as string)).toBe(expected);
  });

  test.each(['', 'Free', 'EUR 12.00', '$1,23.45', '$12.345', '$12.', '$.99'])(
    'rejects unsupported or malformed input %j',
    (text) => expect(() => moneyToCents(text)).toThrow('Expected a USD price'),
  );
});
