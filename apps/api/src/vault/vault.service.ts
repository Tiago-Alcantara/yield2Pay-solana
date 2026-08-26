import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { TransactionInstruction } from '@solana/web3.js';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';

/**
 * Cofre de rendimento. Antes era DeFindex (Soroban); agora é Kamino Lend (Solana).
 *
 * Os métodos estão vazios de propósito: a SDK da Kamino (`@kamino-finance/klend-sdk`)
 * ainda não entrou no projeto. A forma do contrato é a que o resto do backend já
 * consome, então plugar a SDK é preencher estes corpos — nenhum chamador muda.
 *
 * O que cada método precisa fazer quando a SDK entrar:
 *
 *  - buildDepositInstructions: `KaminoAction.buildDepositTxns` na reserve de USDC
 *    do market configurado, com `owner` = carteira da família. Devolver só as
 *    instruções: quem monta a transação é o SolanaService, porque é ele que põe
 *    o sponsor como feePayer.
 *
 *  - buildWithdrawInstructions: `KaminoAction.buildWithdrawTxns` com o mesmo
 *    contrato. Sacar por valor em USDC (não por quantidade de cTokens): o share
 *    price sobe com o rendimento, então converter aqui evita erro de arredondamento
 *    na borda.
 *
 *  - getApyPercent: APY da reserve (`reserve.stats.supplyInterestAPY`), como string,
 *    porque SpendableView.apyPercent vai direto pra tela.
 *
 *  - getPositionValue: valor RESGATÁVEL em USDC base units (6 casas), não a
 *    contagem de cTokens. É a mesma pegadinha que a versão DeFindex documentava:
 *    o share price passa de 1 conforme rende, então reportar cTokens subestima a
 *    posição. Usar `obligation.deposits` convertido pelo exchange rate da reserve.
 */
@Injectable()
export class VaultService {
  private readonly marketAddress: string;
  private readonly reserveAddress: string;

  constructor(@Inject(APP_CONFIG) config: Env) {
    this.marketAddress = config.kaminoMarketAddress;
    this.reserveAddress = config.kaminoReserveAddress;
  }

  /** Market e reserve configurados. Expostos para log e para o VaultPosition. */
  get target(): { marketAddress: string; reserveAddress: string } {
    return {
      marketAddress: this.marketAddress,
      reserveAddress: this.reserveAddress,
    };
  }

  async buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    void ownerAddress;
    void amountBaseUnits;
    throw new NotImplementedException('Kamino deposit not wired yet');
  }

  async buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    void ownerAddress;
    void amountBaseUnits;
    throw new NotImplementedException('Kamino withdraw not wired yet');
  }

  /**
   * APY da reserve como string de percentual.
   * Devolve '0' enquanto a SDK não entra, para o dashboard renderizar sem quebrar.
   */
  async getApyPercent(): Promise<string> {
    return '0';
  }

  /**
   * Valor resgatável da posição, em USDC base units (6 casas).
   * Devolve 0n enquanto a SDK não entra: o dashboard mostra principal sem
   * rendimento em vez de estourar.
   */
  async getPositionValue(ownerAddress: string): Promise<bigint> {
    void ownerAddress;
    return 0n;
  }
}
