# Deploy & devnet readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o caminho de deploy (Vercel + Render) e o setup de devnet documentados e executáveis: DEPLOY.md sem resíduos Stellar, guia do fee sponsor, checklist de smoke E2E.

**Architecture:** `render.yaml` já está correto para Solana (devnet, USDC mint, envs Kamino). O que falta é documentação: `docs/DEPLOY.md` ainda lista `DEFINDEX_API_KEY`/`VAULT_ADDRESS` (Stellar) e um guia operacional do fee sponsor + smoke test não existem.

**Tech Stack:** Render (Docker + Postgres), Vercel, Solana CLI, `curl`.

**Spec:** Levantamento do repo + decisão do usuário: 3 planos (este é o 3). A definição do ambiente do vault (devnet vs mainnet-beta) saiu da investigação do Plano 1 — onde este plano menciona cluster, seguir o que o Plano 1 fixar.

## Global Constraints

- Nenhum segredo entra no repo (chaves do sponsor ficam só no Render dashboard e `.env` local, que é gitignored).
- Docs em inglês (padrão do `docs/DEPLOY.md` atual).
- Commits: só quando o usuário pedir (CLAUDE.md).

---

### Task 1: DEPLOY.md sem Stellar

**Files:**
- Modify: `docs/DEPLOY.md`

- [ ] **Step 1: Corrigir a seção do backend (item 2.2)**

Substituir a lista de env vars secretas por:

```markdown
2. After the first deploy, set the secret env vars in the Render dashboard
   (marked `sync: false`): `PRIVY_APP_ID`, `PRIVY_APP_SECRET`,
   `KAMINO_MARKET_ADDRESS`, `KAMINO_RESERVE_ADDRESS`,
   `FEE_SPONSOR_SECRET_KEY`, and `CORS_ORIGIN`
   (= your Vercel web origin, e.g. `https://yield2pay.vercel.app`).
```

- [ ] **Step 2: Reescrever a seção 3 ("After both are up")**

Substituir o bloco inteiro por:

```markdown
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
```

- [ ] **Step 3: Remover a referência a Stellar no topo**

O arquivo não menciona Stellar fora da seção 3 (que foi reescrita) e da linha 61 ("a funded Stellar wallet") — coberta pela reescrita. Conferir com:

Run: `grep -in "stellar\|defindex\|vault_address\|vault address" docs/DEPLOY.md`
Expected: nenhuma ocorrência.

---

### Task 2: Guia local (README da API)

**Files:**
- Modify: `README.md` e `README.en.md` (seção de status/roadmap)

- [ ] **Step 1: Atualizar o bloco de status**

Onde o README marca as telas family como "protótipo" e o Kamino como
"especificado, não ligado", atualizar após a execução dos planos 1 e 2 para
refletir: telas ligadas à API, cofre Kamino ativo. Enquanto os planos 1–2 não
executarem, **não** mudar nada aqui — esta task é o último passo antes do
deploy real e só faz sentido no fim da fila.

**Nota ao executor:** esta task é deliberadamente condicional. Se os planos 1 e 2 ainda não foram executados, pule-a e registre no relatório.

---

### Task 3: Validação local do blueprint

**Files:**
- Modify: nenhum (verificação)

- [ ] **Step 1: validar o render.yaml**

```bash
# se tiver o render CLI:
render blueprint check
# sem CLI: conferir manualmente que cada envVars key de render.yaml
# existe em apps/api/src/config/env.ts (schema zod)
grep -oP 'key: \K[A-Z_]+' render.yaml | sort > /tmp/render_keys.txt
grep -oP "'?\K[A-Z_]{3,}(?=')" apps/api/src/config/env.ts | sort -u > /tmp/env_keys.txt
diff /tmp/render_keys.txt /tmp/env_keys.txt
```

Expected: `SOLANA_CLUSTER`, `APP_ENV`, `SOLANA_RPC_URL`, `USDC_MINT` (defaults do blueprint) e as `sync: false` aparecem no schema; nenhuma key órfã. (`PORT` e `DATABASE_URL` vêm do Render, não precisam de default no yaml.)

- [ ] **Step 2: conferir o Dockerfile sobe**

```bash
docker build -f apps/api/Dockerfile -t yield2pay-api .
```

Expected: build conclui. (Se não houver Docker na máquina, registrar como não verificado.)

---

## Self-Review

- **Cobertura:** CORS (já implementado via `CORS_ORIGIN`; só documenta), docs de deploy (Task 1), sponsor keypair (Task 1 §3), smoke E2E (Task 1 §5), blueprint (Task 3), README (Task 2, condicional). O que ficou de fora de propósito: CI (não existe e não é bloqueio para MVP), monitoramento/alertas de saldo do sponsor (pós-MVP).
- **Placeholders:** nenhum.
- **Consistência:** nomes de env batem com `apps/api/src/config/env.ts` e `render.yaml`.
