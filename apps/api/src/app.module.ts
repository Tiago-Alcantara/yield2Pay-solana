import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { HouseholdModule } from './household/household.module';
import { WalletModule } from './wallet/wallet.module';
import { VaultModule } from './vault/vault.module';
import { LedgerModule } from './ledger/ledger.module';
import { SolanaModule } from './solana/solana.module';
import { DepositModule } from './deposit/deposit.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { SubsModule } from './subs/subs.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppConfigModule,
    PrismaModule,
    HouseholdModule,
    WalletModule,
    VaultModule,
    LedgerModule,
    SolanaModule,
    DepositModule,
    WithdrawModule,
    SubsModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
