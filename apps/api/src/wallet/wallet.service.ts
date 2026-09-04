import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SolanaService } from '../solana/solana.service';
import type { WalletBalanceView } from '@yield2pay/shared';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly solana: SolanaService,
  ) {}

  /**
   * Registra a carteira embedded da família e garante a ATA de USDC on-chain.
   *
   * A ATA vem antes de persistir: se a criação falhar, não gravamos uma carteira
   * que não recebe USDC. O sponsor paga o aluguel da ATA.
   */
  async register(householdId: string, solanaAddress: string) {
    if (!SolanaService.isValidAddress(solanaAddress)) {
      throw new BadRequestException('invalid solana address');
    }
    const usdcTokenAccount =
      await this.solana.ensureUsdcTokenAccount(solanaAddress);
    try {
      return await this.prisma.wallet.upsert({
        where: { householdId },
        create: { householdId, solanaAddress, usdcTokenAccount },
        update: { solanaAddress, usdcTokenAccount },
      });
    } catch (e) {
      // Concorrência: duas chamadas de ensureWallet() (ex. React Strict Mode
      // remontando efeitos) chegam quase juntas. O upsert acima só é atômico
      // no conflito de householdId — um conflito na constraint única de
      // solana_address (mesmo endereço, primeira chamada já criou a linha)
      // ainda estoura P2002. Se o vencedor da corrida já gravou o mesmo
      // endereço, não é erro: devolve a linha existente.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.wallet.findUnique({
          where: { householdId },
        });
        if (existing && existing.solanaAddress === solanaAddress) {
          return existing;
        }
      }
      throw e;
    }
  }

  async getAddress(householdId: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { householdId },
    });
    if (!wallet) throw new NotFoundException('wallet not registered');
    return wallet.solanaAddress;
  }

  /**
   * Saldo USDC da carteira.
   *
   * Na Stellar descontávamos um buffer de reserva (1.5 XLM) porque a conta do
   * cliente precisava manter reserva mínima e pagar taxa. Na Solana o sponsor é
   * o feePayer e paga o aluguel da ATA, então nada fica retido: spendable é o
   * saldo inteiro.
   */
  async getBalance(householdId: string): Promise<WalletBalanceView> {
    const address = await this.getAddress(householdId);
    const balance = await this.solana.getUsdcBalance(address);
    return { balance: balance.toString(), spendable: balance.toString() };
  }
}
