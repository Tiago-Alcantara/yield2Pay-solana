'use client';

import { usePrivy } from '@privy-io/react-auth';
import {
  useSignTransaction,
  useWallets,
} from '@privy-io/react-auth/solana';
import type { BuildTxResponse, SubmitTxDto, SubmitTxResponse } from '@yield2pay/shared';
import { useWallet } from './useWallet';
import { createApi } from './api';

/**
 * Devolve `deposit` e `withdraw`, que orquestram o fluxo completo:
 *  1. garante que a carteira existe
 *  2. pede a transação montada ao backend (base64, sponsor já como feePayer)
 *  3. assina com o Privy
 *  4. devolve assinada para o backend enviar
 *  5. retorna a assinatura da transação
 *
 * deposit e withdraw seguem exatamente o mesmo fluxo, mudando só quais endpoints
 * de build/submit são chamados — por isso compartilham `runSolanaTx`.
 *
 * Diferença em relação ao fluxo Stellar que isto substitui: lá assinávamos um
 * hash solto e o backend embrulhava num fee-bump. Aqui o cliente assina a
 * transação inteira, e o patrocínio da taxa já está nela (o sponsor é o feePayer
 * e assinou antes de mandar). Non-custodial: a chave nunca sai do Privy.
 */
export function useSolanaTx(): {
  deposit(amountBaseUnits: string): Promise<string>;
  withdraw(amountBaseUnits: string): Promise<string>;
} {
  const { getAccessToken } = usePrivy();
  const { ensureWallet } = useWallet();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const api = createApi(getAccessToken);

  async function runSolanaTx(
    build: (amountBaseUnits: string) => Promise<BuildTxResponse>,
    submit: (body: SubmitTxDto) => Promise<SubmitTxResponse>,
    amountBaseUnits: string,
  ): Promise<string> {
    const address = await ensureWallet();

    const wallet = wallets.find((w) => w.address === address);
    if (!wallet) {
      throw new Error('solana wallet not connected');
    }

    const { transactionBase64 } = await build(amountBaseUnits);

    const { signedTransaction } = await signTransaction({
      transaction: base64ToBytes(transactionBase64),
      wallet,
    });

    const { txSignature } = await submit({
      signedTransactionBase64: bytesToBase64(signedTransaction),
      solanaAddress: address,
      amount: amountBaseUnits,
    });

    return txSignature;
  }

  return {
    deposit: (amountBaseUnits) =>
      runSolanaTx(api.buildDeposit, api.submitDeposit, amountBaseUnits),
    withdraw: (amountBaseUnits) =>
      runSolanaTx(api.buildWithdraw, api.submitWithdraw, amountBaseUnits),
  };
}

// O Privy troca transação como bytes; a API troca como base64. atob/btoa
// bastam e evitam depender do Buffer do Node no bundle do browser.
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
