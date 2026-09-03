import { describe, expect, it } from 'vitest';
import {
  fmtBRL,
  fmtBRLShort,
  isValidEmail,
  isValidPixKey,
  numericOnly,
  parseBRL,
  fmtUsdc,
  fmtUsdcShort,
  parseUsdc,
  toUsdcNumber,
  toBaseUnitsString,
} from './familyFormat';

describe('fmtBRL', () => {
  it('sempre mostra dois decimais em pt-BR', () => {
    expect(fmtBRL(1234.5)).toBe('R$ 1.234,50');
    expect(fmtBRL(0)).toBe('R$ 0,00');
  });
});

describe('fmtBRLShort', () => {
  it('arredonda e esconde os centavos', () => {
    expect(fmtBRLShort(1234.5)).toBe('R$ 1.235');
    expect(fmtBRLShort(59.9)).toBe('R$ 60');
  });
});

describe('parseBRL', () => {
  it('lê um valor digitado em pt-BR', () => {
    expect(parseBRL('1.234,56')).toBeCloseTo(1234.56);
    expect(parseBRL('500')).toBe(500);
  });
  it('devolve zero para entrada vazia ou inválida', () => {
    expect(parseBRL('')).toBe(0);
    expect(parseBRL('abc')).toBe(0);
  });
});

describe('numericOnly', () => {
  it('descarta tudo que não for dígito, ponto ou vírgula', () => {
    expect(numericOnly('R$ 1.234,56x')).toBe('1.234,56');
  });
});

describe('isValidEmail', () => {
  it('aceita e-mail com domínio', () => {
    expect(isValidEmail('ana@email.com')).toBe(true);
  });
  it('rejeita o que não tem @ ou domínio', () => {
    expect(isValidEmail('ana@email')).toBe(false);
    expect(isValidEmail('ana')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPixKey', () => {
  it('aceita e-mail', () => {
    expect(isValidPixKey('ana@email.com')).toBe(true);
  });
  it('aceita telefone e CPF (10 a 14 dígitos)', () => {
    expect(isValidPixKey('(11) 90000-0000')).toBe(true);
    expect(isValidPixKey('123.456.789-00')).toBe(true);
  });
  it('rejeita chave curta demais', () => {
    expect(isValidPixKey('123')).toBe(false);
  });
});

describe('formato USDC', () => {
  it('formata com 2 casas e prefixo USDC', () => {
    expect(fmtUsdc(1234.56)).toBe('USDC 1.234,56');
    expect(fmtUsdc(0)).toBe('USDC 0,00');
  });

  it('formata sem centavos no formato curto', () => {
    expect(fmtUsdcShort(1234.56)).toBe('USDC 1.235');
  });

  it('lê valor digitado em pt-BR', () => {
    expect(parseUsdc('1.234,56')).toBe(1234.56);
    expect(parseUsdc('')).toBe(0);
  });

  it('converte base units (6 casas) da API para number', () => {
    expect(toUsdcNumber('1234500000')).toBe(1234.5);
    expect(toUsdcNumber(0n)).toBe(0);
  });

  it('converte number para base units como string', () => {
    expect(toBaseUnitsString(1234.56)).toBe('1234560000');
    expect(toBaseUnitsString(0.000001)).toBe('1');
  });
});
