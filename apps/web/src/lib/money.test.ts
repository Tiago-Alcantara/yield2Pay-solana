import { formatUsdc, toBaseUnits } from './money';

describe('formatUsdc (display: 2 decimals)', () => {
  it('always renders exactly 2 decimal places, rounding half-up', () => {
    expect(formatUsdc('1075000')).toBe('1.08'); // 1.075 → 1.08
  });
  it('rounds sub-unit values to 2 dp', () => {
    expect(formatUsdc('7500')).toBe('0.01'); // 0.0075 → 0.01
  });
  it('formats zero', () => {
    expect(formatUsdc('0')).toBe('0.00');
  });
  it('formats large values without precision loss', () => {
    expect(formatUsdc('900000000000')).toBe('900000.00');
  });
});

describe('toBaseUnits', () => {
  it('converts a human USDC string to 6-decimal base units', () => {
    expect(toBaseUnits('1.075')).toBe('1075000');
    expect(toBaseUnits('900000')).toBe('900000000000');
  });
  it('rejects more than 6 decimal places', () => {
    expect(() => toBaseUnits('1.1234567')).toThrow();
  });
});
