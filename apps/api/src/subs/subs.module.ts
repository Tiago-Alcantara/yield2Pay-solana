import { Module } from '@nestjs/common';
import { SubsService } from './subs.service';
import { SubsController } from './subs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SubsService],
  controllers: [SubsController],
})
export class SubsModule {}
