import { BadRequestException } from '@nestjs/common';
import {
  USDC_DECIMALS,
  formatBaseUnits,
  parseBaseUnits,
  toBaseUnits,
} from './parse-money';

describe('parseBaseUnits', () => {
  it('returns a bigint for a valid positive integer string', () => {
    expect(parseBaseUnits('1000000')).toBe(1000000n);
    expect(parseBaseUnits('1')).toBe(1n);
    expect(parseBaseUnits('999999999999999999')).toBe(999999999999999999n);
  });

  it('throws for empty string', () => {
    expect(() => parseBaseUnits('')).toThrow(BadRequestException);
  });

  it('throws for undefined', () => {
    expect(() => parseBaseUnits(undefined)).toThrow(BadRequestException);
  });

  it('throws for null', () => {
    expect(() => parseBaseUnits(null)).toThrow(BadRequestException);
  });

  it('throws for non-numeric string', () => {
    expect(() => parseBaseUnits('abc')).toThrow(BadRequestException);
    expect(() => parseBaseUnits('1e5')).toThrow(BadRequestException);
    expect(() => parseBaseUnits('12abc')).toThrow(BadRequestException);
  });

  it('throws for decimal string', () => {
    expect(() => parseBaseUnits('1.5')).toThrow(BadRequestException);
    expect(() => parseBaseUnits('100.00')).toThrow(BadRequestException);
  });

  it('throws for zero', () => {
    expect(() => parseBaseUnits('0')).toThrow(BadRequestException);
  });

  it('throws for negative-sign prefix', () => {
    expect(() => parseBaseUnits('-1')).toThrow(BadRequestException);
    expect(() => parseBaseUnits('-100')).toThrow(BadRequestException);
  });
});

describe('USDC decimals (Solana)', () => {
  it('uses 6 decimal places, not Stellar 7', () => {
    expect(USDC_DECIMALS).toBe(6);
  });

  it('formats base units as a human decimal string', () => {
    expect(formatBaseUnits(10_000_000n)).toBe('10');
    expect(formatBaseUnits(10_500_000n)).toBe('10.5');
    expect(formatBaseUnits(1n)).toBe('0.000001');
    expect(formatBaseUnits(0n)).toBe('0');
    expect(formatBaseUnits(-2_500_000n)).toBe('-2.5');
  });

  it('parses a human decimal string into base units', () => {
    expect(toBaseUnits('10')).toBe(10_000_000n);
    expect(toBaseUnits('10.5')).toBe(10_500_000n);
    expect(toBaseUnits('0.000001')).toBe(1n);
  });

  it('rejects more decimals than the mint supports', () => {
    expect(() => toBaseUnits('1.1234567')).toThrow(BadRequestException);
  });

  it('round-trips through base units', () => {
    expect(formatBaseUnits(toBaseUnits('123.456789'))).toBe('123.456789');
  });
});

describe('BigInt JSON serialization shim', () => {
  it('serializes BigInt as decimal string', () => {
    expect(JSON.stringify({ x: 1n })).toBe('{"x":"1"}');
    expect(JSON.stringify({ amount: 1000000n })).toBe('{"amount":"1000000"}');
  });
});
