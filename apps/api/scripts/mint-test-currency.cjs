/* Emite unidades da moeda de teste ("Real de teste", USDC_MINT em modo mock)
 * para qualquer carteira devnet. O sponsor é a mint authority (criada por
 * create-mock-devnet-mints.cjs), então não depende de faucet externo.
 *
 * uso: node apps/api/scripts/mint-test-currency.cjs <carteira> <valor_em_reais>
 * exemplo: node apps/api/scripts/mint-test-currency.cjs 7xKX...9df 100
 */
const path = require('path');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} = require('@solana/spl-token');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DECIMALS = 6;

(async () => {
  const [walletArg, amountArg] = process.argv.slice(2);
  if (!walletArg || !amountArg) {
    console.error(
      'uso: node apps/api/scripts/mint-test-currency.cjs <carteira> <valor_em_reais>',
    );
    process.exit(1);
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const secret = process.env.FEE_SPONSOR_SECRET_KEY;
  const currencyMintAddress = process.env.USDC_MINT;
  if (!secret || !currencyMintAddress) {
    console.error(
      'FEE_SPONSOR_SECRET_KEY e USDC_MINT precisam estar em apps/api/.env',
    );
    process.exit(1);
  }

  const trimmed = secret.trim();
  const sponsor = trimmed.startsWith('[')
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)))
    : Keypair.fromSecretKey(new Uint8Array(Buffer.from(trimmed, 'base64')));

  const connection = new Connection(rpcUrl, 'confirmed');
  const currencyMint = new PublicKey(currencyMintAddress);
  const wallet = new PublicKey(walletArg);
  const baseUnits = BigInt(Math.round(Number(amountArg) * 10 ** DECIMALS));

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    sponsor,
    currencyMint,
    wallet,
  );
  await mintTo(connection, sponsor, currencyMint, ata.address, sponsor, baseUnits);

  console.log(`Emitido ${amountArg} (moeda de teste) para ${walletArg}`);
  console.log('ATA:', ata.address.toBase58());
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
