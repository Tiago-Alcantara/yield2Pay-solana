import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';
import { SolanaModule } from '../solana/solana.module';
import { SolanaService } from '../solana/solana.service';
import { VaultService } from './vault.service';
import { KaminoVaultService } from './kamino-vault.service';
import { MockVaultService } from './mock-vault.service';

@Module({
  imports: [SolanaModule],
  providers: [
    {
      provide: VaultService,
      useFactory: (config: Env, solana: SolanaService): VaultService =>
        config.vaultProvider === 'mock'
          ? new MockVaultService(config, solana)
          : new KaminoVaultService(config),
      inject: [APP_CONFIG, SolanaService],
    },
  ],
  exports: [VaultService],
})
export class VaultModule {}
