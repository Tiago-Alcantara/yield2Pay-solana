import { Request } from 'express';

/**
 * Request após o AuthGuard: carrega o householdId resolvido a partir do token
 * Privy. O AuthGuard anexa `req.householdId` antes de qualquer controller rodar.
 */
export interface AuthenticatedRequest extends Request {
  householdId: string;
}
