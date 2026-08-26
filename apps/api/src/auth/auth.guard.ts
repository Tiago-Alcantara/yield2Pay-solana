import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrivyService } from './privy.service';
import { HouseholdService } from '../household/household.service';
import { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly privy: PrivyService,
    private readonly households: HouseholdService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    if (!token) throw new UnauthorizedException('missing bearer token');

    let claims: { privyUserId: string };
    try {
      claims = await this.privy.verify(token);
    } catch {
      throw new UnauthorizedException('invalid token');
    }

    const household = await this.households.findOrCreate(claims.privyUserId);
    req.householdId = household.id;
    return true;
  }
}
