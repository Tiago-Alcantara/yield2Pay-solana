# Kamino Lend SDK — superfície real (GATE / Task 1)

> **Este arquivo é autoritativo.** O plano diz: "Se qualquer assinatura neste plano
> divergir daquele arquivo, o arquivo vence." Onde o SDK real contradiz as Tasks 2–5,
> está marcado com **⚠️ CONTRADIZ O PLANO**.

Pacote instalado: `@kamino-finance/klend-sdk@11.0.2`
Local físico (pnpm store, hash pode mudar):
`node_modules/.pnpm/@kamino-finance+klend-sdk@11.0.2_.../node_modules/@kamino-finance/klend-sdk`
Caminho estável para grep: `apps/api/node_modules/@kamino-finance/klend-sdk/dist/...`
(as citações abaixo usam o caminho relativo ao pacote: `dist/...:LINHA`.)

Sem `exports` map e sem `peerDependencies` no package.json do SDK. `main: dist/index.js`,
`types: dist/index.d.ts`. Tudo é reexportado da raiz via `dist/lib.d.ts`
(`export * from './classes' | './utils' | './lending_operations' | ...`), então Tasks
importam de `@kamino-finance/klend-sdk` direto.

---

## 0. DUAS DESCOBERTAS QUE QUEBRAM AS TASKS 2–5 (ler antes de tudo)

### 0.1 ⚠️ CONTRADIZ O PLANO — o SDK é `@solana/kit` (web3.js 2.x), não web3.js 1.x

O brief (Step 1) assume "a SDK klend é da era web3.js 1.x". **Falso.** O `package.json`
do klend-sdk declara:

```
"@solana/kit": "^2.3.0"        (resolvido: 2.3.0)
"@coral-xyz/anchor": "^0.28.0"
"@solana-program/system|token|token-2022|address-lookup-table": "0.x"
"@solana/compat": "^2.3.0", "@solana/sysvars": "^2.3.0"
```

Não há `@solana/web3.js` como dependência direta do SDK. O `@solana/web3.js@1.98.4`
que aparece na lockfile é **transitivo** (via `@coral-xyz/anchor@0.28` e `@solana/spl-token`),
não a lib principal do SDK. Portanto **não há conflito de web3.js 2.x para travar com
`pnpm.overrides`** — o cenário do Step 1 não se aplica.

Toda a superfície pública do SDK usa tipos **kit**, não web3.js 1.x:
- `dist/classes/action.d.ts:1` → `import { Address, AccountMeta, Instruction, Option, TransactionSigner } from '@solana/kit';`
- `dist/classes/market.d.ts:1` → `import { Address, Commitment, ... Rpc } from '@solana/kit';`
- `dist/classes/reserve.d.ts:2` → `import { Address, Instruction, TransactionSigner, Rpc, ... } from '@solana/kit';`

**Impacto direto no contrato do repo:**
- `VaultService.buildDepositInstructions/buildWithdrawInstructions` devolve
  `TransactionInstruction[]` (web3.js 1.x, `vault.service.ts:2,54,63`).
- `SolanaService.buildSponsoredTransaction(instructions: TransactionInstruction[])`
  monta uma `VersionedTransaction` web3.js 1.x (`solana.service.ts:141-155`).
- O SDK produz `Instruction` **kit** (shape `{ programAddress, accounts, data }`),
  incompatível com `TransactionInstruction` web3.js (`{ programId, keys, data }`).

> As Tasks 2–5, como escritas no plano (assumindo `TransactionInstruction[]` e web3.js),
> **não compilam** contra este SDK. É preciso decidir uma ponte:
> (a) converter cada `Instruction` kit → `TransactionInstruction` web3.js dentro do
>     VaultService (map `programAddress`→`new PublicKey(...)`, `accounts[]`→`keys[]`
>     com `{pubkey,isSigner,isWritable}`, `data: Uint8Array`→`Buffer`); ou
> (b) migrar `SolanaService` para `@solana/kit`.
> Isso é uma decisão de arquitetura que o plano não previu. **Escalado no relatório.**

### 0.2 ⚠️ BLOQUEADOR DE RUNTIME — `require('@kamino-finance/klend-sdk')` CRASHA

Importar o SDK (bare `require` de dentro de `apps/api`) estoura:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './program-client-core' is not
defined by "exports" in .../@solana-program+memo@0.13.0_@solana+kit@5.5.1_.../@solana/kit/package.json
    at exportsNotFound (node:internal/modules/esm/resolve:313:10)
    ...
    at Module.require (node:internal/modules/cjs/loader:1504:12)   // durante require('@kamino-finance/klend-sdk')
```

Causa-raiz: há **duas** majors de `@solana/kit` na árvore (`2.3.0` e `5.5.1`).
`@solana-program/memo@0.13.0` declara `peerDependencies: { "@solana/kit": "^8.0.0" }`
mas foi linkado contra `@solana/kit@5.5.1`, e seu código faz
`require('@solana/kit/program-client-core')` — subpath que o `exports` do kit 5.5.1 não
define. Existe também `@solana-program/memo@0.7.0` (par com kit 2.3.0, o correto para o
klend), mas o grafo do klend acabou resolvendo o 0.13.0.

**Consequência:** o probe do Step 3 (`KaminoMarket.load`) não pôde ser executado, e
Tasks 2–6 não conseguem usar o SDK em runtime até isto ser resolvido.

**Correção recomendada (NÃO aplicada nesta task — precisa de validação ampla):**
`pnpm.overrides` na raiz do workspace fixando uma única versão de kit/memo compatível
com o klend, p.ex.:
```jsonc
// package.json (raiz)
"pnpm": { "overrides": { "@solana-program/memo": "0.7.0" } }
```
ou forçar `@solana/kit` a uma única major. **Deve ser validado contra a suíte da API
E contra o frontend (apps/web usa kit 5.5.1)** antes de confiar. Não apliquei porque é
mudança de blast-radius amplo num working tree já sujo de trabalho de frontend não
relacionado.

---

## 1. Construtor de `KaminoAction` / enum de ações

- `KaminoAction` tem **construtor privado** (`dist/classes/action.d.ts:68`
  `private constructor();`). Não se instancia com `new`. Usa-se os factory estáticos
  `build*Txns` ou `KaminoAction.initialize(props)`.
- **Não existe enum `ACTIONS`.** O tipo de ação é uma string literal union
  (`dist/classes/action.d.ts:13`):
  ```ts
  export type ActionType = 'deposit' | 'borrow' | 'withdraw' | 'repay' | 'mint'
    | 'redeem' | 'depositCollateral' | 'liquidate' | 'depositAndBorrow' | ...;
  ```
  ⚠️ CONTRADIZ O PLANO (Step 2 item 1 fala em "enum `ACTIONS`").
- `KaminoAction.initialize(props: InitializeActionProps): Promise<KaminoAction>`
  (`dist/classes/action.d.ts:70`). `InitializeActionProps` em
  `dist/classes/actionTypes.d.ts:29-40`:
  ```ts
  interface InitializeActionProps {
    kaminoMarket: KaminoMarket; action: ActionType; amount: string | BN;
    reserveAddress: Address; owner: TransactionSigner;
    obligation: KaminoObligation | ObligationType;
    referrer?: Option<Address>; currentLedgerInstant: LedgerInstant;
    payer?: TransactionSigner; permissionAuthority?: TransactionSigner;
  }
  ```

## 2. `buildDepositTxns` / `buildWithdrawTxns` — assinatura e como extrair instruções

⚠️ CONTRADIZ O PLANO (Step 2 item 2): **não recebem args posicionais e não devolvem
`ITransactionLite`.** Não existe tipo `ITransactionLite` no SDK. Ambos recebem **um
objeto de props** e devolvem `Promise<KaminoAction>`:

- `static buildDepositTxns(props: BuildDepositTxnsProps): Promise<KaminoAction>`
  (`dist/classes/action.d.ts:75`)
- `static buildWithdrawTxns(props: BuildWithdrawTxnsProps): Promise<KaminoAction>`
  (`dist/classes/action.d.ts:126`)

`BuildDepositTxnsProps` (`dist/classes/actionTypes.d.ts:44-64`) — obrigatórios:
```ts
kaminoMarket: KaminoMarket;
amount: string | BN;                 // base units USDC (6 casas) como string/BN
reserveAddress: Address;             // kit Address (string base58), não PublicKey
owner: TransactionSigner;            // ⚠️ kit signer, não string/PublicKey — ver §9
obligation: KaminoObligation | ObligationType;   // ver §9 (VanillaObligation)
useV2Ixs: boolean;                   // obrigatório
scopeRefreshConfig: ScopePriceRefreshConfig | undefined;  // obrigatório (pode ser undefined)
currentLedgerInstant: LedgerInstant; // obrigatório — ver §9 (getCurrentLedgerInstant)
// opcionais: extraComputeBudget, includeAtaIxs, requestElevationGroup,
//            initUserMetadata, referrer, overrideElevationGroupRequest,
//            permissionAuthority, obligationCustomizations
```
`BuildWithdrawTxnsProps` (`dist/classes/actionTypes.d.ts:150-169`) — mesma forma
(`amount`, `useV2Ixs`, `scopeRefreshConfig`, `currentLedgerInstant`, etc.).

**Extrair `Instruction[]` do `KaminoAction` resultante:**
- Estático: `KaminoAction.actionToIxs(action: KaminoAction): Array<Instruction>`
  (`dist/classes/action.d.ts:331`) — achata tudo (compute budget + setup + lending +
  cleanup) na ordem certa. **É o "flat instructions" a usar.**
  - relacionados: `actionToLendingIxs` (`:332`), `actionToIxLabels` (`:333`).
- Campos de instância (todos `Array<Instruction>`, `dist/classes/action.d.ts:48-62`):
  `computeBudgetIxs`, `setupIxs`, `inBetweenIxs`, `lendingIxs`, `postLendingIxs`,
  `cleanupIxs` (mais os `*Labels`). O plano cita `setupIxs` — existe (`:50`), mas a
  "transação principal" não é um campo: as ixs de empréstimo estão em `lendingIxs` (`:55`).
- **Todas são `Instruction` kit**, não `TransactionInstruction` web3.js (ver §0.1).

## 3. `KaminoMarket.load` — assinatura e retorno

⚠️ CONTRADIZ O PLANO (Step 2 item 3 / Step 3): não é `load(connection, marketAddress)`.

`dist/classes/market.d.ts:46`:
```ts
static load(
  rpc: Rpc<KaminoMarketRpcApi>,      // kit Rpc, NÃO web3.js Connection
  marketAddress: Address,            // kit Address
  recentSlotDurationMs: number,      // OBRIGATÓRIO (o plano omite) — usar DEFAULT_RECENT_SLOT_DURATION_MS (=350)
  programId?: Address,               // PROGRAM_ID exportado na raiz
  withReserves?: boolean,            // default true
  farmsProgramId?: Address
): Promise<KaminoMarket | null>;     // NULLABLE
```
- `KaminoMarketRpcApi` (`market.d.ts:12`) = interseção de APIs kit
  (`GetAccountInfoApi & GetMultipleAccountsApi & GetProgramAccountsApi & GetSlotApi & ...`).
  Cria-se com `createSolanaRpc(url)` do `@solana/kit`.
- `DEFAULT_RECENT_SLOT_DURATION_MS = 350` (`dist/classes/reserve.d.ts:17`, reexportado).
- `reserves` é `Map<Address, KaminoReserve>` (`market.d.ts:25`), **não array** — usar
  `.size` ou `market.getReserves(): Array<KaminoReserve>` (`market.d.ts:60`).
  ⚠️ O probe do brief usa `m.reserves ?? []` + `.length` — errado para um `Map`.

## 4. Pegar a reserve — NÃO existe `market.getReserve`

⚠️ CONTRADIZ O PLANO (Step 2 item 4). Métodos reais:
- `getReserveByAddress(address: Address): KaminoReserve | undefined` (`market.d.ts:123`)
- `getExistingReserveByAddress(address: Address, description?): KaminoReserve`
  (`market.d.ts:128`, lança se não existir)
- por mint: `getReservesByMint` (`:135`), `getFloatRateReserveByMint` (`:167`), etc.
`KaminoReserve` é a classe em `dist/classes/reserve.d.ts:53`.

## 5. APY de supply — NÃO é `reserve.stats.supplyInterestAPY`

⚠️ CONTRADIZ O PLANO (Step 2 item 5). `reserve.stats` é do tipo `ReserveDataType`
(`dist/classes/shared.d.ts:44-63`) e **não tem** nenhum campo de APY/APR (só status,
mintAddress, borrowCurve, loanToValue, limites, decimals, borrowFactor, etc.).

Forma correta — método (`dist/classes/reserve.d.ts:682`):
```ts
totalSupplyAPY(currentInstant: LedgerInstant): number
```
- Implementação (`dist/classes/reserve.js:1303-1309`):
  `calculateAPYFromAPR(this.calculateSupplyAPR(currentInstant, 0))`.
- **Retorna FRAÇÃO** (ex.: `0.0512` = 5,12%). `getApyPercent()` precisa multiplicar por 100
  e stringificar.
- É só o **rendimento de juros de empréstimo**; NÃO inclui a distribuição de rewards.
  Para o yield total do depositante, somar
  `calculateTheoreticalReserveRewardsSupplyAPR(instant, referralFeeBps)`
  (`dist/classes/reserve.d.ts:506`).
- Exige um `LedgerInstant` (ver §9). Também precisa dos `stats` da reserve carregados
  (feito por `KaminoMarket.load`).

## 6. Posição do owner — vive na OBLIGATION, não numa ATA de kToken

⚠️ CONTRADIZ O PLANO (Step 2 item 6, "kToken ATA balance × exchange rate").
O fluxo de depósito que o stub usa é `KaminoAction.buildDepositTxns`, que deposita o
colateral **dentro de uma obligation** (por isso `obligation` é prop obrigatória,
`actionTypes.d.ts:49`). **Não há saldo de cToken numa ATA da carteira** nesse fluxo.
Ler qualquer ATA para estimar a posição é o modelo errado aqui.

Caminho correto (bate com `vault.service.ts:31` "Usar `obligation.deposits`"):
- Pegar a obligation do usuário:
  `market.getObligationByWallet(owner: Address, obligationType): Promise<KaminoObligation | null>`
  (`dist/classes/market.d.ts:116`), ou `getUserVanillaObligation(user)` (`market.d.ts:304`).
- Valor resgatável em USDC base units (direto, já com juros):
  `obligation.getDepositAmountByReserve(reserve: KaminoReserve): Decimal`
  (`dist/classes/obligation.d.ts:197`).
  - Alternativa: `obligation.getDepositByReserve(reserveAddress: Address): Position | undefined`
    (`obligation.d.ts:193`) e ler `Position.amount`.
  - `Position.amount` (`obligation.d.ts:16-20`): *"Amount of tokens in lamports,
    including decimal places for interest accrued (no borrow factor weighting)"* — ou
    seja, **liquidez (USDC) em base units, já convertida do colateral e com juros
    acumulados** (a `KaminoObligation` é construída com `collateralExchangeRates`,
    `obligation.d.ts:117-120`).
- Converter `Decimal` → `bigint` base units: `BigInt(amount.floor().toString())`.
- `deposits: Map<Address, Position>` (`obligation.d.ts:99`); valor USD total via
  `getDepositedValue()` (`obligation.d.ts:169`).

> **Este é exatamente o bug que o dispatch temia, e pior:** o código do plano lê
> `reserve.liquidity.mintPubKey` como "kToken mint" e derivaria a ATA de USDC do usuário
> → reportaria o USDC solto na carteira como se fosse a posição do cofre. No fluxo de
> obligation nem existe ATA de kToken; a posição tem de sair de
> `obligation.getDepositAmountByReserve`.

## 7. Helper pronto vs. matemática manual (as 3 perguntas do kToken)

**A) Qual campo é o mint do colateral / kToken (cujo ATA guardaria as shares):**
- Helper: `reserve.getCTokenMint(): Address` — `dist/classes/reserve.d.ts:666`.
  Doc (`:663-665`): *"the mint of the reserve collateral token , i.e. the cToken minted
  for depositing the liquidity token"*.
- Campo cru: `reserve.state.collateral.mintPubkey`
  (`dist/@codegen/klend/types/ReserveCollateral.d.ts:5` → `mintPubkey: Address`).

**B) Qual campo é o mint subjacente / liquidez (USDC):**
- Helper: `reserve.getLiquidityMint(): Address` — `dist/classes/reserve.d.ts:658`.
  Doc (`:655-657`): *"the mint of the reserve liquidity token"*.
- Campo cru: `reserve.state.liquidity.mintPubkey`
  (`dist/@codegen/klend/types/ReserveLiquidity.d.ts:5` → `mintPubkey: Address`).

> ⚠️ **A ruling do dispatch está CONFIRMADA pelos typings.** `liquidity.*` é o lado
> **USDC (subjacente)**; o kToken é `collateral.mintPubkey`. O bloco do plano na Task 5
> que chama `reserve.liquidity.mintPubKey` de "the kToken mint" está **errado** — lê o
> mint do USDC. (Nota: o plano ainda escreve `mintPubKey` com K maiúsculo; o campo real
> é `mintPubkey`, minúsculo — nem compilaria.)

**C) Converter quantidade de kToken → USDC base units (PREFERIR helper):**
- **Helper (preferir):** `reserve.cTokensToLiquidity(cTokens: Decimal, instant: LedgerInstant,
  exchangeRate?: Decimal, referralFeeBps?: number): Decimal` — `dist/classes/reserve.d.ts:307`.
  Devolve a liquidez (USDC, base units) correspondente a um montante de cTokens.
- Estático: `KaminoReserve.cTokensToLiquidity(cTokens: Decimal, exchangeRate: Decimal): Decimal`
  (`dist/classes/reserve.d.ts:314`).
- Campo de exchange rate (se precisar manual): `getCollateralExchangeRate(): Decimal`
  (`reserve.d.ts:292`, "stale ... escalado por 1e18") ou o estimado
  `getEstimatedCollateralExchangeRate(instant, referralFeeBps)` (`reserve.d.ts:298`).
- Também no market: `getCollateralExchangeRatesByReserve(instant): Map<Address, Decimal>`
  (`market.d.ts:341`).

> **Observação importante para a Task 5:** no fluxo de obligation (§6), você NÃO precisa
> desta conversão manual — `obligation.getDepositAmountByReserve` já devolve USDC base
> units. `cTokensToLiquidity` só é necessário se algum dia se usar o fluxo alternativo
> `buildDepositReserveLiquidityTxns` (mint de cTokens direto na carteira,
> `action.d.ts:119`), aí sim com ATA de cToken.

## 8. Saque por valor em USDC (nota para a Task 4)

`vault.service.ts:20-23` quer sacar por valor em USDC, não por quantidade de cTokens.
- `BuildWithdrawTxnsProps.amount: string | BN` (`actionTypes.d.ts:152`) — **verificar na
  Task 4** se `buildWithdrawTxns` interpreta `amount` como liquidez (USDC) ou colateral.
  O `addWithdrawIx(collateralAmount: BN)` interno (`action.d.ts:252`) recebe colateral.
- Helper de conversão liquidez→colateral:
  `getWithdrawCollateralAmount(reserve: KaminoReserve, amount: BN): BN` (`action.d.ts:321`)
  — *"Converts a liquidity `amount` to withdraw ... into the cToken amount the withdraw
  instruction takes, at the reserve's exchange rate ..."*.
- Para "sacar tudo", o idioma Kamino costuma ser passar `U64_MAX`; confirmar na Task 4.

## 9. Pré-requisitos kit que o plano não menciona (Tasks 2–4)

- **`owner: TransactionSigner`**, não string. O servidor NÃO assina pelo usuário (Privy
  assina no cliente). Envolver o endereço num **noop signer**: `createNoopSigner(address)`
  do `@solana/kit` — gera um signer que não contribui assinatura mas dá os account-metas
  certos ao SDK. (Depois o `SolanaService`/Privy anexa a assinatura real.)
- **`obligation: KaminoObligation | ObligationType`.** Para lend simples, usar
  `new VanillaObligation(PROGRAM_ID)` — `dist/utils/ObligationType.d.ts:19`
  (`ObligationType` union em `:3`). `PROGRAM_ID` é exportado da raiz
  (`dist/lib.d.ts` → `export * from './@codegen/klend/programId'`).
- **`currentLedgerInstant: LedgerInstant`** exigido em quase toda chamada. Tipo
  (`dist/utils/ledger.d.ts`): `{ slot: Slot; blockTime: UnixTimestamp }`. Obter com
  `getCurrentLedgerInstant(rpc, commitment?): Promise<LedgerInstant>`
  (`dist/utils/rpc.d.ts:16`), reexportado da raiz.
- **`useV2Ixs: boolean`** e **`scopeRefreshConfig: ScopePriceRefreshConfig | undefined`**
  são props obrigatórias em deposit/withdraw.
- Imports esperados da raiz `@kamino-finance/klend-sdk`: `KaminoAction`, `KaminoMarket`,
  `KaminoReserve`, `KaminoObligation`, `VanillaObligation`, `PROGRAM_ID`,
  `DEFAULT_RECENT_SLOT_DURATION_MS`, `getCurrentLedgerInstant`. Tipos kit
  (`Address`, `Instruction`, `TransactionSigner`, `Rpc`, `createSolanaRpc`,
  `createNoopSigner`, `address`) vêm de `@solana/kit` (que **não** é dep direta de
  `apps/api` hoje — precisaria ser adicionada, ou reexportada).

---

## 10. Step 3 — Probe de cluster (devnet × mainnet): saída CRUA

### 10.1 Probe do brief (`KaminoMarket.load` na devnet): NÃO EXECUTÁVEL
Bloqueado pelo crash de import de §0.2. Saída crua do crash ao dar
`require('@kamino-finance/klend-sdk')` de dentro de `apps/api`:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './program-client-core' is not
defined by "exports" in
node_modules/.pnpm/@solana-program+memo@0.13.0_@solana+kit@5.5.1_.../@solana/kit/package.json
    at exportsNotFound (node:internal/modules/esm/resolve:313:10)
    at packageExportsResolve (node:internal/modules/esm/resolve:661:9)
    at Module._load (node:internal/modules/cjs/loader:1227:37)
Node.js v24.11.1  (exit 1)
```
(O probe do brief ainda usaria a API errada — `Connection`/`PublicKey`/2 args — que
também não casa com `load` real, §3.)

### 10.2 Probe substituto — raw JSON-RPC `getAccountInfo` (sem importar o SDK)
Read-only, não gasta nada. Endereços testados: programa klend
`KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`; market do brief
`Eo9WKFqxVwZLP7Y9wLwELBSgekUrogy7WgCijyyDkGiY`; palpite de main market
`7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6Js6Cxs1rrKz`. Saída crua:
```
== DEVNET (https://api.devnet.solana.com) ==
  klend program KLend2g3...: EXISTS owner=BPFLoaderUpgradeab1e111...1111 executable=true dataLen=36
  main market   7u3HeH...:   NULL (account does not exist)
  brief market  Eo9WKF...:   NULL (account does not exist)

== MAINNET (https://api.mainnet-beta.solana.com) ==
  klend program KLend2g3...: EXISTS owner=BPFLoaderUpgradeab1e111...1111 executable=true dataLen=36
  main market   7u3HeH...:   NULL (account does not exist)
  brief market  Eo9WKF...:   NULL (account does not exist)
```
Leitura: o **programa klend está deployado em devnet E mainnet** (executable). O market
do brief (`Eo9WKF...`) **não existe em nenhum dos dois**. O palpite `7u3HeH...` também é
NULL nos dois → **os endereços de market usados aqui não são confiáveis**; os endereços
reais de mainnet têm de vir da doc oficial da Kamino / app.kamino.finance (Task 6), não
deste probe.

### 10.3 Decisão de cluster que o critério implica
Critério do brief: *market carrega na devnet com reserve de USDC → devnet; falha →
mainnet com teto baixo.* O market de devnet do probe **não resolve** (NULL) e
`KaminoMarket.load` sequer roda para enumerar markets de devnet (§0.2). Kamino é
mainnet-first e não há endereço de market/reserve de devnet conhecido/documentado.

➡️ **Decisão: MVP em `mainnet-beta` com teto baixo.** Por §68 do plano/brief:
`SOLANA_CLUSTER=mainnet-beta`, RPC pago, `USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
market/reserve de USDC da Kamino vindos da doc oficial, e
`MAX_DEPOSIT_BASE_UNITS` (hoje `10_000_000_000n` = 10.000 USDC em `deposit.service.ts:15`)
**baixa para 100 USDC** (`100_000_000n`).

> **NÃO alterei** `.env` nem `deposit.service.ts` — isso é Task 6 (decisão do dispatch).
> Os endereços exatos de market/reserve/USDC de mainnet precisam ser confirmados na doc
> oficial da Kamino antes de preencher o `.env`.
