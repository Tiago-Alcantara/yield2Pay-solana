import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { VaultService } from '../vault/vault.service';
import { SolanaService } from '../solana/solana.service';
import { LedgerService } from '../ledger/ledger.service';
import { WalletService } from '../wallet/wallet.service';
import { parseBaseUnits } from '../common/parse-money';
import type { BuildTxResponse, SubmitTxDto } from '@yield2pay/shared';

// Teto de segurança para um aporte único: 10.000 USDC em base units (6 casas).
// Bem acima do aporte esperado de uma família; ajustar ao limite real do produto.
const MAX_DEPOSIT_BASE_UNITS = 10_000_000_000n;

@Injectable()
export class DepositService {
  constructor(
    private readonly vault: VaultService,
    private readonly solana: SolanaService,
    private readonly ledger: LedgerService,
    private readonly wallet: WalletService,
  ) {}

  async build(householdId: string, amount: bigint): Promise<BuildTxResponse> {
    if (amount > MAX_DEPOSIT_BASE_UNITS) {
      throw new BadRequestException('amount exceeds maximum deposit');
    }
    // Não checamos saldo aqui: o aporte falha on-chain se a carteira não tiver
    // USDC, e a simulação da própria transação já dá o erro melhor descrito.
    const address = await this.wallet.getAddress(householdId);
    const instructions = await this.vault.buildDepositInstructions(
      address,
      amount,
    );
    return this.solana.buildSponsoredTransaction(instructions);
  }

  async submit(
    householdId: string,
    dto: SubmitTxDto,
  ): Promise<{ txSignature: string }> {
    const registered = await this.wallet.getAddress(householdId);
    if (dto.solanaAddress !== registered) {
      throw new ForbiddenException(
        'solana address does not match registered wallet',
      );
    }
    const { txSignature } = await this.solana.submitSignedTransaction(
      dto.signedTransactionBase64,
    );
    await this.ledger.recordDeposit(
      householdId,
      parseBaseUnits(dto.amount),
      txSignature,
    );
    return { txSignature };
  }
}
