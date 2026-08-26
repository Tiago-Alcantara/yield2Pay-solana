import { Module } from '@nestjs/common';
import { HouseholdService } from './household.service';

@Module({
  providers: [HouseholdService],
  exports: [HouseholdService],
})
export class HouseholdModule {}
