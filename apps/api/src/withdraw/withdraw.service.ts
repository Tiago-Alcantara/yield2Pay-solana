import { ForbiddenException, Injectable } from '@nestjs/common';
import { VaultService } from '../vault/vault.service';
import { SolanaService } from '../solana/solana.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerService } from '../ledger/ledger.service';
import { parseBaseUnits } from '../common/parse-money';
import type { BuildTxResponse, SubmitTxDto } from '@yield2pay/shared';

@Injectable()
export class WithdrawService {
  constructor(
    private readonly vault: VaultService,
    private readonly solana: SolanaService,
    private readonly wallet: WalletService,
    private readonly ledger: LedgerService,
  ) {}

  async build(householdId: string, amount: bigint): Promise<BuildTxResponse> {
    const address = await this.wallet.getAddress(householdId);
    const instructions = await this.vault.buildWithdrawInstructions(
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
    await this.ledger.recordWithdraw(
      householdId,
      parseBaseUnits(dto.amount),
      txSignature,
    );
    return { txSignature };
  }
}
