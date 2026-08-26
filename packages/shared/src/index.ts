// ── Família ───────────────────────────────────────────────────────────────────

/** Categoria da assinatura que o rendimento deve cobrir. */
export type SubCategory = 'streaming' | 'utility' | 'education' | 'other';

export interface CreateSubDto {
  name: string;
  /** USDC em base units (6 casas). */
  monthlyCost: string;
  category: SubCategory;
  /** Posição na fila de cobertura. Menor = pago primeiro. Default: fim da lista. */
  priority?: number;
  memberId?: string;
}

export interface Sub {
  id: string;
  name: string;
  monthlyCost: string;
  category: SubCategory;
  priority: number;
  status: string;
  memberId: string | null;
}

/** Reordena a fila de cobertura: a posição no array é a nova prioridade. */
export interface ReorderSubsDto {
  subIds: string[];
}

export interface CreateMemberDto {
  name: string;
}

export interface Member {
  id: string;
  name: string;
  isOwner: boolean;
}

// ── Carteira e transações (Solana) ────────────────────────────────────────────

export interface RegisterWalletDto {
  /** Endereço da carteira embedded Solana (base58). */
  solanaAddress: string;
}

/**
 * Transação montada pela API, serializada em base64.
 *
 * O sponsor (tesouraria) já vem como feePayer e com a assinatura dele anexada —
 * o cliente só acrescenta a própria assinatura e devolve. É o que substitui o
 * fee-bump da Stellar: na Solana o patrocínio de taxa é o próprio feePayer.
 */
export interface BuildTxResponse {
  transactionBase64: string;
}

export interface SubmitTxDto {
  /** Transação já assinada pelo cliente, base64. */
  signedTransactionBase64: string;
  solanaAddress: string;
  /** USDC em base units (6 casas). Registrado no livro após confirmação. */
  amount: string;
}

export interface SubmitTxResponse {
  /** Assinatura da transação Solana (base58). */
  txSignature: string;
}

export interface WalletBalanceView {
  /** Saldo USDC da carteira em base units (6 casas). */
  balance: string;
  /**
   * Quanto dá para aportar. Na Solana o sponsor paga a taxa e o aluguel da ATA,
   * então não há reserva retida: spendable == balance. O campo permanece porque
   * as telas já o consomem e porque um dia o cliente pode pagar a própria taxa.
   */
  spendable: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface SpendableView {
  vaultValue: string;
  principal: string;
  spendable: string;
  apyPercent: string;
  returnsChangePercent: string | null;
}

// ── Erros (contrato entre a API e as telas de erro) ───────────────────────────

/** Ambiente lógico da aplicação. Governa quanto detalhe o erro expõe. */
export type AppEnv = 'production' | 'staging' | 'development';

/**
 * Conjunto fechado de status que as telas de erro sabem apresentar. O filter da
 * API normaliza qualquer outro status para um destes antes de responder.
 */
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 408 | 500 | 502 | 503;

/** Bloco de depuração — presente apenas fora de produção. */
export interface ErrorTechnicalDetails {
  method: string;
  endpoint: string;
  requestId: string;
  message: string;
  stack: string;
}

/** Corpo de toda resposta de erro da API. */
export interface ApiErrorPayload {
  statusCode: ErrorStatusCode;
  errorId: string;
  timestamp: string;
  /**
   * Mensagem segura para o usuário. As telas usam a cópia própria de
   * STATUS_COPY; este campo serve ao tratamento inline que já existe.
   */
  message: string;
  technicalDetails?: ErrorTechnicalDetails;
}
