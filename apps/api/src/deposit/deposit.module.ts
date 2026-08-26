import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { VaultModule } from '../vault/vault.module';
import { SolanaModule } from '../solana/solana.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [VaultModule, SolanaModule, LedgerModule, WalletModule, AuthModule],
  controllers: [DepositController],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}
