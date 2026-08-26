import { BadRequestException } from '@nestjs/common';

/**
 * Casas decimais do USDC na Solana.
 *
 * A Stellar usava 7 (stroops); o mint do USDC na Solana usa 6. Toda conversão
 * entre valor humano e base units passa por aqui — se este número divergir do
 * mint, os valores saem 10x errados sem erro nenhum, então é a única fonte.
 */
export const USDC_DECIMALS = 6;

const DIVISOR = 10n ** BigInt(USDC_DECIMALS);

/**
 * Parse de um valor monetário em base units (6 casas) para bigint.
 *
 * Regras:
 *  - String não-vazia só de dígitos (sem ponto decimal, sinal ou espaço)
 *  - Precisa ser > 0
 *
 * Lança BadRequestException para qualquer entrada inválida.
 */
export function parseBaseUnits(raw: string | undefined | null): bigint {
  if (raw === undefined || raw === null || raw === '') {
    throw new BadRequestException('amount is required');
  }

  if (!/^\d+$/.test(raw)) {
    throw new BadRequestException(
      'amount must be a non-negative integer string (base units)',
    );
  }

  const value = BigInt(raw);

  if (value <= 0n) {
    throw new BadRequestException('amount must be greater than zero');
  }

  return value;
}

/**
 * Converte base units (6 casas) para a string decimal legível.
 *
 * Ex.: 10000000n -> "10", 10500000n -> "10.5", 1n -> "0.000001".
 *
 * As instruções SPL de transfer/deposit recebem u64 em base units direto, então
 * isto serve para log e para o que a UI exibe — não para montar transação.
 */
export function formatBaseUnits(baseUnits: bigint): string {
  const negative = baseUnits < 0n;
  const absolute = negative ? -baseUnits : baseUnits;
  const whole = absolute / DIVISOR;
  const fraction = absolute % DIVISOR;
  const sign = negative ? '-' : '';
  if (fraction === 0n) return `${sign}${whole}`;
  const fractionStr = fraction
    .toString()
    .padStart(USDC_DECIMALS, '0')
    .replace(/0+$/, '');
  return `${sign}${whole}.${fractionStr}`;
}

/**
 * Converte uma string decimal legível ("10.5") para base units (6 casas).
 * Rejeita mais casas decimais do que o mint suporta em vez de arredondar em
 * silêncio — arredondar aqui esconde erro de entrada do usuário.
 */
export function toBaseUnits(human: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(human)) {
    throw new BadRequestException('amount must be a positive decimal string');
  }
  const [whole, fraction = ''] = human.split('.');
  if (fraction.length > USDC_DECIMALS) {
    throw new BadRequestException(
      `amount supports at most ${USDC_DECIMALS} decimal places`,
    );
  }
  return BigInt(whole + fraction.padEnd(USDC_DECIMALS, '0'));
}
