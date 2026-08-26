import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { AuthModule } from '../auth/auth.module';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [AuthModule, SolanaModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
