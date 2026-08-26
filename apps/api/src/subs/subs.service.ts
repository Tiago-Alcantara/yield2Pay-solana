import { Injectable } from '@nestjs/common';
import type { CreateSubDto, ReorderSubsDto } from '@yield2pay/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseBaseUnits } from '../common/parse-money';

@Injectable()
export class SubsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma assinatura no fim da fila de cobertura quando `priority` não vem.
   * A fila é o que decide quais contas o rendimento do mês paga primeiro, então
   * uma assinatura nova não deve furar a ordem que a família já escolheu.
   */
  async create(householdId: string, dto: CreateSubDto) {
    const priority = dto.priority ?? (await this.nextPriority(householdId));
    return this.prisma.sub.create({
      data: {
        householdId,
        memberId: dto.memberId,
        name: dto.name,
        monthlyCost: parseBaseUnits(dto.monthlyCost),
        category: dto.category,
        priority,
      },
    });
  }

  list(householdId: string) {
    return this.prisma.sub.findMany({
      where: { householdId },
      orderBy: { priority: 'asc' },
    });
  }

  async remove(householdId: string, id: string): Promise<void> {
    await this.prisma.sub.deleteMany({ where: { id, householdId } });
  }

  /**
   * Reordena a fila: a posição de cada id no array passa a ser a prioridade.
   *
   * Roda numa transação porque uma reordenação parcial deixaria duas assinaturas
   * com a mesma prioridade — e aí a ordem que a UI mostra vira indefinida.
   * O `where` inclui householdId para um id de outra família não ser afetado.
   */
  async reorder(householdId: string, dto: ReorderSubsDto): Promise<void> {
    await this.prisma.$transaction(
      dto.subIds.map((id, index) =>
        this.prisma.sub.updateMany({
          where: { id, householdId },
          data: { priority: index },
        }),
      ),
    );
  }

  private async nextPriority(householdId: string): Promise<number> {
    const last = await this.prisma.sub.findFirst({
      where: { householdId },
      orderBy: { priority: 'desc' },
      select: { priority: true },
    });
    return last ? last.priority + 1 : 0;
  }
}
