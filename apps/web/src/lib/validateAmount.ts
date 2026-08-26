import { toBaseUnits } from './money';

/**
 * Valida um valor monetário digitado pelo usuário (aporte, saque, custo de
 * assinatura). Retorna `null` se válido, ou a mensagem de erro a exibir.
 */
export function validateAmount(raw: string): string | null {
  if (!raw || raw === '0') return 'Enter a positive amount';
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed <= 0) return 'Enter a positive amount';
  try {
    toBaseUnits(raw); // lança se >6 casas decimais ou não-numérico
    return null;
  } catch {
    return 'Max 6 decimal places';
  }
}
