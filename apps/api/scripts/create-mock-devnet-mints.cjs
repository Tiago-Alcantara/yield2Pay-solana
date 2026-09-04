/* Cria os dois SPL mints usados pelo MockVaultService (VAULT_PROVIDER=mock)
 * em devnet: a moeda de teste ("Real de teste", substitui USDC_MINT) e a
 * cota do cofre mock. Rodar uma vez; os endereços impressos vão no
 * apps/api/.env. */
const path = require('path');
const { Connection, Keypair } = require('@solana/web3.js');
const { createMint } = require('@solana/spl-token');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function loadSponsorKeypair(secret) {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  const decoded = Buffer.from(trimmed, 'base64');
  return Keypair.fromSecretKey(new Uint8Array(decoded));
}

(async () => {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  if (!/devnet/i.test(rpcUrl)) {
    console.error(`Este script só roda contra devnet. SOLANA_RPC_URL atual: ${rpcUrl}`);
    process.exit(1);
  }
  const secret = process.env.FEE_SPONSOR_SECRET_KEY;
  if (!secret) {
    console.error('FEE_SPONSOR_SECRET_KEY não definido em apps/api/.env');
    process.exit(1);
  }

  const sponsor = loadSponsorKeypair(secret);
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('sponsor:', sponsor.publicKey.toBase58());
  console.log('rpc:', rpcUrl);

  // decimals=6 em ambos, mesma granularidade que USDC — os valores em base
  // units batem 1:1 entre moeda e cota.
  const currencyMint = await createMint(
    connection,
    sponsor,
    sponsor.publicKey,
    null,
    6,
  );
  const shareMint = await createMint(
    connection,
    sponsor,
    sponsor.publicKey,
    null,
    6,
  );

  console.log('\nAdicione ao apps/api/.env:');
  console.log(`USDC_MINT=${currencyMint.toBase58()}`);
  console.log(`MOCK_VAULT_SHARE_MINT=${shareMint.toBase58()}`);
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
