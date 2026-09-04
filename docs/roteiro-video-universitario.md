# Roteiro — Vídeo de Pitch (Hackathon Universitário Solana Brasil)

Duração máxima: 5 minutos. Estrutura obrigatória minuto a minuto.

---

## MINUTO 1 — O problema (0:00–1:00)

Toda casa tem uma pilha de assinaturas recorrentes — Netflix, Spotify, academia, cursos — que
saem da conta todo mês e não voltam. Exemplo de base: Netflix R$ 59,90 + Spotify Família
R$ 34,90 + escola de inglês R$ 189,00 = **R$ 283,80/mês**. Em 12 meses, isso é **R$ 3.405,60**
gastos, sem nenhum retorno do capital.

O problema não é o valor da assinatura — é que o dinheiro que paga essas contas nunca teve
chance de trabalhar antes de ser gasto.

**[TELA]** Tabela do README: "Sem Yield2Pay vs Com Yield2Pay".

---

## MINUTO 2 — A solução: Yield2Pay (1:00–2:00)

Yield2Pay inverte a lógica: em vez de gastar o dinheiro, você deposita uma vez em um cofre DeFi
na Solana. **Só o rendimento** cobre as assinaturas; o principal nunca é tocado e pode ser
sacado a qualquer momento. Não é produto de investimento com promessa de retorno — é
infraestrutura de pagamento sobre um yield variável (pode ser zero).

Métrica central do produto — **Percentual de Liberdade**:

```
rendimento_mensal    = depósito × taxa_anual ÷ 12
depósito_necessário  = mensalidade × 12 ÷ taxa_anual
liberdade            = rendimento_mensal ÷ mensalidade × 100   (teto 100%)
```

Exemplo com R$ 400/mês de assinaturas a 8% a.a.: R$ 60.000 depositados rendem R$ 400/mês —
**100% de liberdade**, as assinaturas se pagam sozinhas. A lista de assinaturas é ordenada por
prioridade; cobertura é calculada de cima para baixo (`familyMath.ts` —
`monthlyYieldOf`, `depositForMonthly`, `freedomPercent`, `coverageRows`).

**[TELA]** Landing `/family` — calculadora de liberdade em tempo real.

---

## MINUTO 3 — Por que Solana (2:00–3:00)

Arquitetura Web2.5 — blockchain escondida atrás de UX Web2, três peças:

- **Privy** — embedded wallet Solana via login Google/Apple, sem seed phrase. O cliente é o
  único que assina; a chave privada nunca passa pelo servidor.
- **Fee payer patrocinado** — a tesouraria monta cada transação como fee payer (assinatura
  parcial) e paga o aluguel da ATA de USDC. Na Solana não existe fee-bump: quem cobre a taxa é
  o fee payer da transação, então o usuário nunca precisa comprar SOL. Há guarda no submit:
  transação cujo fee payer não é o sponsor é rejeitada.
- **Kamino Lend** — motor de rendimento. Reserve de USDC de um market Kamino capturando o APY
  de lending — protocolo aberto e auditado, não promessa própria.

Por que Solana especificamente e não outra chain: custo de transação marginal (viabiliza
patrocinar gas em escala), finalidade rápida, e ecossistema DeFi maduro (Kamino) pra capturar
yield real sobre USDC sem construir motor de lending do zero.

Stack on-chain: `@solana/web3.js`, SPL Token, dinheiro em `BigInt` (base units de 6 casas,
padrão USDC) — nunca `float`, com shim `BigInt.prototype.toJSON` pra serialização na API.

**[TELA]** Diagrama "O tripé Web2.5" do README — Privy / Fee payer / Kamino Lend.

---

## MINUTO 4 — Como funciona na prática (3:00–4:00)

**[DEMO/PROTÓTIPO — depende da task de mockup pronta]**

Fluxo completo, 8 rotas em `/family` (PT/EN, responsivo):

1. **Onboarding** — login social → carteira Solana embutida provisionada (`ensureWallet()`).
2. **Registro da carteira** — backend valida endereço, cria ATA de USDC idempotente (aluguel
   pago pela tesouraria).
3. **Depósito** — backend monta transação patrocinada, cliente assina na embedded wallet, valor
   entra no cofre.
4. **Cadastro de assinaturas** — nome, valor, vencimento, prioridade, membro que usa.
5. **Dashboard** — Percentual de Liberdade, saldo, rendimento, histórico, detalhe por
   assinatura.
6. **Saque** — resgate do principal a qualquer momento.

Narração: "Aqui está o fluxo ponta a ponta: depósito, cofre rendendo, rendimento cobrindo as
contas na ordem de prioridade, e o principal sempre disponível pra saque."

Nota técnica: hoje o cofre Kamino Lend está especificado em `vault/` (build de
deposit/withdraw/APY/posição) mas ainda não ligado à SDK (`@kamino-finance/klend-sdk`) — a
devnet valida o fluxo completo com um cofre mock (`VAULT_PROVIDER=mock`, dois SPL tokens de
teste), já que o oracle Scope que toda reserve Kamino exige não está deployado em devnet.

**[TELA]** Dashboard `/family/dashboard` navegável, calculadora, tela de saque.

---

## MINUTO 5 — Time e próximos passos (4:00–5:00)

**[Apresentar integrantes — nome, curso, instituição — puxar da task "Coleta dos Dados do
Time"]**

Onde estamos: backend rodando na devnet Solana — auth Privy, household no primeiro login,
wallet com ATA patrocinada, transações com guarda contra fee payer estranho, ledger com
principal/spendable/snapshot diário, CRUD de assinaturas, modo demo (`DEMO_YIELD_BPS`) pra
UI antes do cofre real. Telas `/family` são protótipo de frontend navegável.

Próximos passos:

- Ligar a SDK Kamino Lend em `vault/` (deposit/withdraw/APY/posição real).
- Plugar `/family` no backend completo (auth · wallet · deposit · withdraw · subs · ledger).
- Rampa fiat BRL ⇄ USDC — hoje o aporte é direto em USDC, sem on-ramp.
- Motor de cobrança automatizado — resgatar só o yield no vencimento e pagar a assinatura.
- Devnet → mainnet-beta.

---

**Stack:** NestJS 11 · Next.js 16 · React 19 · TypeScript · Prisma 7 · Postgres 16 ·
Solana web3.js · SPL Token · Privy · Kamino Lend · pnpm workspaces.
