import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';

/**
 * Lê a chave da tesouraria no formato que o `solana-keygen` grava (id.json): um
 * array JSON de 64 bytes. Aceita também base64.
 *
 * Não usamos base58 de propósito: decodificar base58 exigiria a dependência
 * `bs58`, e o pnpm deste repo é estrito (dependência transitiva não importa).
 * O formato de array é o que uma chave de servidor já tem em disco.
 */
function loadSponsorKeypair(secret: string): Keypair {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  const decoded = Buffer.from(trimmed, 'base64');
  if (decoded.length !== 64) {
    throw new Error(
      'FEE_SPONSOR_SECRET_KEY must be a 64-byte JSON array (solana-keygen id.json) or base64',
    );
  }
  return Keypair.fromSecretKey(new Uint8Array(decoded));
}

/**
 * Camada de rede. Substitui o StellarService.
 *
 * Diferença central em relação à Stellar: não existe fee-bump. Na Solana quem
 * paga a taxa é o `feePayer` da própria transação, então o patrocínio da
 * tesouraria é montar a transação com o sponsor como feePayer e assiná-la
 * parcialmente antes de mandar pro cliente. O cliente acrescenta a assinatura
 * dele e devolve — nunca vemos a chave privada dele.
 *
 * Também não há "criar conta" nem reserva mínima de 1 XLM: na Solana o endereço
 * já é uma conta de sistema. O que precisa ser criado (e pagar aluguel) é a ATA
 * de USDC, e quem paga esse aluguel é o sponsor.
 */
@Injectable()
export class SolanaService {
  private readonly _connection: Connection;
  private readonly sponsor: Keypair;
  private readonly usdcMint: PublicKey;

  constructor(
    @Inject(APP_CONFIG) config: Env,
    @Optional() connection?: Connection,
  ) {
    this._connection =
      connection ?? new Connection(config.solanaRpcUrl, 'confirmed');
    this.sponsor = loadSponsorKeypair(config.feeSponsorSecretKey);
    this.usdcMint = new PublicKey(config.usdcMint);
  }

  get connection(): Connection {
    return this._connection;
  }

  get sponsorAddress(): string {
    return this.sponsor.publicKey.toBase58();
  }

  /**
   * Valida um endereço base58 de 32 bytes que pode assinar.
   * Equivale ao `StrKey.isValidEd25519PublicKey` da Stellar: `isOnCurve` descarta
   * PDAs, que são endereços válidos mas sem chave privada.
   */
  static isValidAddress(address: string): boolean {
    try {
      return PublicKey.isOnCurve(new PublicKey(address).toBytes());
    } catch {
      return false;
    }
  }

  /** Endereço da ATA de USDC derivado do dono. Determinístico, não toca a rede. */
  async getUsdcTokenAccount(ownerAddress: string): Promise<string> {
    const ata = await getAssociatedTokenAddress(
      this.usdcMint,
      new PublicKey(ownerAddress),
    );
    return ata.toBase58();
  }

  /**
   * Garante que a ATA de USDC do dono existe on-chain, com o sponsor pagando o
   * aluguel. Idempotente: a instrução `...Idempotent` não falha se a conta já
   * existir, então dois registros simultâneos não brigam.
   *
   * Substitui o `ensureAccountFunded` da Stellar.
   */
  async ensureUsdcTokenAccount(ownerAddress: string): Promise<string> {
    const owner = new PublicKey(ownerAddress);
    const ata = await getAssociatedTokenAddress(this.usdcMint, owner);
    const instruction = createAssociatedTokenAccountIdempotentInstruction(
      this.sponsor.publicKey,
      ata,
      owner,
      this.usdcMint,
    );
    const { transactionBase64 } = await this.buildSponsoredTransaction([
      instruction,
    ]);
    // Só o sponsor precisa assinar a criação da ATA — o dono não é signer aqui.
    await this.submitSignedTransaction(transactionBase64);
    return ata.toBase58();
  }

  /** Saldo USDC da ATA em base units (6 casas). 0 se a ATA ainda não existe. */
  async getUsdcBalance(ownerAddress: string): Promise<bigint> {
    const ata = await getAssociatedTokenAddress(
      this.usdcMint,
      new PublicKey(ownerAddress),
    );
    try {
      const account = await getAccount(this._connection, ata);
      return account.amount;
    } catch {
      // ATA ainda não criada → saldo 0. Não é erro: acontece antes do 1º aporte.
      return 0n;
    }
  }

  /**
   * Empacota instruções numa VersionedTransaction com o sponsor como feePayer,
   * já assinada pelo sponsor e serializada em base64 para o cliente assinar.
   *
   * Substitui `hashForSigning` + fee-bump da Stellar: o cliente assina a
   * transação inteira (Privy faz isso na carteira embedded), não um hash solto.
   */
  async buildSponsoredTransaction(
    instructions: TransactionInstruction[],
  ): Promise<{ transactionBase64: string }> {
    const { blockhash } = await this._connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: this.sponsor.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign([this.sponsor]);
    return {
      transactionBase64: Buffer.from(transaction.serialize()).toString('base64'),
    };
  }

  /**
   * Envia a transação já assinada pelo cliente e espera confirmação.
   *
   * A assinatura do sponsor foi anexada em buildSponsoredTransaction e sobrevive
   * à ida e volta porque o cliente assina exatamente a mesma mensagem.
   */
  async submitSignedTransaction(
    signedTransactionBase64: string,
  ): Promise<{ txSignature: string }> {
    const raw = Buffer.from(signedTransactionBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(raw);

    // Guarda contra o cliente devolver uma transação diferente da que montamos:
    // se o feePayer não é o sponsor, o patrocínio não se aplica.
    if (
      !transaction.message.staticAccountKeys[0].equals(this.sponsor.publicKey)
    ) {
      throw new Error('transaction feePayer is not the sponsor');
    }

    const signature = await this._connection.sendRawTransaction(raw, {
      skipPreflight: false,
    });
    const { blockhash, lastValidBlockHeight } =
      await this._connection.getLatestBlockhash();
    const confirmation = await this._connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );
    if (confirmation.value.err) {
      throw new Error(
        `tx ${signature} failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
      );
    }
    return { txSignature: signature };
  }
}
