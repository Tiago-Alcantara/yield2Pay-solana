import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { CreateSubDto, ReorderSubsDto } from '@yield2pay/shared';
import { SubsService } from './subs.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('subs')
@UseGuards(AuthGuard)
export class SubsController {
  constructor(private readonly subsService: SubsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSubDto) {
    return this.subsService.create(req.householdId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.subsService.list(req.householdId);
  }

  @Patch('order')
  @HttpCode(204)
  reorder(@Req() req: AuthenticatedRequest, @Body() dto: ReorderSubsDto) {
    return this.subsService.reorder(req.householdId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.subsService.remove(req.householdId, id);
  }
}
