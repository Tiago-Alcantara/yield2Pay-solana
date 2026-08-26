import { Module } from '@nestjs/common';
import { PrivyService } from './privy.service';
import { AuthGuard } from './auth.guard';
import { HouseholdModule } from '../household/household.module';

@Module({
  imports: [HouseholdModule],
  providers: [PrivyService, AuthGuard],
  exports: [PrivyService, AuthGuard, HouseholdModule],
})
export class AuthModule {}
