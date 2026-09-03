# Yield2Pay — Deploy guide

Monorepo: `apps/web` (Next.js frontend) deploys to **Vercel**; `apps/api`
(NestJS backend) + Postgres deploys to a container host (**Render** blueprint
included; the Dockerfile is portable to **Railway / Fly / any** host).

---

## 1. Frontend → Vercel (`apps/web`)

1. Push the repo to GitHub (`git push origin main`).
2. Vercel → New Project → import the repo.
3. **Root Directory = `apps/web`** (critical — it's a monorepo). Framework
   preset **Next.js** and **pnpm** are auto-detected. Build command default
   (`next build`).
4. Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_PRIVY_APP_ID` — your real Privy app id (without it, only the
     public landing renders; login + authed screens need it).
   - `NEXT_PUBLIC_API_BASE_URL` — the deployed backend URL from step 2 below
     (e.g. `https://yield2pay-api.onrender.com`). Omit for a landing-only deploy.
5. In the **Privy dashboard**, add your Vercel domains (`https://<app>.vercel.app`
   and any preview/custom domains) to the allowed origins, or Privy refuses to
   initialize in production.

`@yield2pay/shared` resolves via `transpilePackages` + the tsconfig path alias;
`packageManager` is pinned so Vercel uses the right pnpm.

---

## 2. Backend → Render (`apps/api`) via the blueprint

1. Render → New → **Blueprint**, point at this repo. `render.yaml` provisions a
   free Postgres (`yield2pay-db`) and a Docker web service (`yield2pay-api`) with a
   `/health` check. `DATABASE_URL` is wired from the database automatically.
2. After the first deploy, set the secret env vars in the Render dashboard
   (marked `sync: false`): `PRIVY_APP_ID`, `PRIVY_APP_SECRET`,
   `KAMINO_MARKET_ADDRESS`, `KAMINO_RESERVE_ADDRESS`,
   `FEE_SPONSOR_SECRET_KEY`, and `CORS_ORIGIN`
   (= your Vercel web origin, e.g. `https://yield2pay.vercel.app`).
3. Migrations run automatically on each deploy (`prisma migrate deploy` in the
   container start command). The app listens on Render's injected `PORT`.

### Alternative: Railway / Fly / any container host

The image is `apps/api/Dockerfile` with **build context = repo root**:

```bash
docker build -f apps/api/Dockerfile -t yield2pay-api .
```

Provide a Postgres `DATABASE_URL` and the same env vars as above. Railway and
Fly auto-detect the Dockerfile; point the build context at the repo root.

---

## 3. Fee sponsor (Solana treasury wallet)

Every deposit/withdrawal transaction is sponsored: the sponsor keypair is the
transaction `feePayer` and also pays the rent of the users' USDC ATAs. It is
generated once and its secret lives only in the Render dashboard (and local
`.env`):

```bash
# generate (writes id.json — a JSON array of 64 bytes)
solana-keygen new --no-bip39-passphrase -o sponsor.json
# devnet only: fund it (2 SOL per airdrop, rate-limited)
solana config set --url devnet
solana airdrop 2 $(solana-keygen pubkey sponsor.json)
```

Set `FEE_SPONSOR_SECRET_KEY` to the **contents** of `sponsor.json` (the JSON
array), not a file path. On mainnet, fund the sponsor with real SOL and monitor
its balance — every user ATA costs ~0.002 SOL of rent plus ~0.000005 SOL per
transaction.

## 4. On-chain checklist (per environment)

- `SOLANA_CLUSTER` / `SOLANA_RPC_URL` — match the environment (`devnet` +
  `https://api.devnet.solana.com`, or `mainnet-beta` + a paid RPC like
  Helius/QuickNode; the public mainnet RPC is not usable for an app).
- `USDC_MINT` — devnet `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`,
  mainnet `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
- `KAMINO_MARKET_ADDRESS` / `KAMINO_RESERVE_ADDRESS` — from the plan 1
  investigation notes; both must exist on the chosen cluster.
- Sponsor funded (see section 3).
- `CORS_ORIGIN` set to the web origin (unset = reflect any origin, dev only).

## 5. Smoke test (run after every deploy)

Manual, ~5 minutes, with a browser wallet that has devnet USDC (faucet:
search "USDC devnet faucet" — Circle's faucet is the canonical one):

1. Open the web URL → login with Privy (Google) → `/family/dashboard` renders
   with `0%` and no console errors.
2. `GET {api}/health` returns 200.
3. `/family/deposito` shows the embedded wallet address (matches the Privy
   wallet).
4. Deposit a small amount → transaction confirms → dashboard principal
   increases by the amount.
5. `/family/saque` → withdraw part of it → transaction confirms → wallet USDC
   balance increases.
6. Check sponsor SOL balance decreased (fees + rent).

If any step fails, the API logs (`[HTTP]` lines for status >= 400) are the
first place to look.
