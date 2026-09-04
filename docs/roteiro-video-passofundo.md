# Roteiro — Vídeo de Pitch (Hackathon Passo Fundo, UPF Parque)

Estrutura obrigatória: problema (contexto BR) → proposta de valor + por que Solana → demo do
produto rodando (fluxo real, não mockup estático).

---

## Bloco 1 — O problema

Liberdade financeira é um sonho quase universal — atravessa idade, gênero, classe, mentalidade.
No Brasil, boa parte das pessoas já economiza pra isso: guarda, poupa, investe pouco a pouco.
Mas o sonho fica abstrato. A pessoa não consegue ver, em números concretos, o quanto daquela
economia já virou liberdade de verdade — e o quanto ainda é só intenção, dinheiro parado sem
propósito visível. Sem esse número palpável, o objetivo nunca sai do campo da promessa: a
maioria começa a poupar, perde a métrica de progresso, e desiste antes de sentir o resultado.

O problema não é falta de vontade de poupar. É falta de um indicador claro que transforme
"economia" em "liberdade mensurável".

**[TELA]** Landing `/family` — hero + calculadora de liberdade.

---

## Bloco 2 — Proposta de valor e por que Solana

Yield2Pay dá esse número. Centraliza suas contas e pagamentos recorrentes num só lugar e
converte a economia acumulada num indicador único, visível e atualizado: o **Percentual de
Liberdade Financeira** — quanto do seu custo de vida mensal o rendimento do que você já
depositou cobre sozinho, de 0% a 100%.

```
rendimento_mensal    = depósito × taxa_anual ÷ 12
liberdade            = rendimento_mensal ÷ custo_mensal × 100   (teto 100%)
```

Não é uma promessa de retorno — é uma ferramenta de pagamento sobre yield real e variável. O
capital nunca é gasto: só o rendimento paga as contas, e o principal sai quando o usuário
quiser.

Por que Solana viabiliza isso na prática:

- **Privy** — embedded wallet Solana via login social (Google/Apple), sem seed phrase — remove a
  barreira de entrada que afasta a maioria das pessoas de cripto.
- **Fee payer patrocinado** — a tesouraria assina como fee payer e cobre o aluguel da ATA de
  USDC; o usuário nunca precisa comprar SOL. Só existe porque na Solana o fee payer da
  transação paga a taxa — sem fee-bump, sem fricção extra.
- **Kamino Lend** — motor de rendimento sobre um market de USDC, protocolo aberto e auditado.
  Custo de transação marginal e finalidade rápida da Solana tornam viável patrocinar essas
  operações em escala, o que inviabilizaria o produto em chains com taxa alta.

Sem esse conjunto — carteira sem fricção, gas patrocinado, yield de protocolo auditado — o
"Percentual de Liberdade" continuaria sendo só uma planilha. Na Solana, ele é um número
on-chain, verificável e atualizado.

**[TELA]** Diagrama "O tripé Web2.5" — Privy / Fee payer / Kamino Lend.

---

## Bloco 3 — Demo do produto rodando

Fluxo real, ponta a ponta, sem cortes que escondam bugs (rodando na devnet Solana):

1. Login social → carteira Solana embutida provisionada.
2. Registro da carteira → backend cria a ATA de USDC (sponsor paga o aluguel).
3. Depósito → transação patrocinada montada pelo backend, assinada pelo cliente, confirmada
   on-chain.
4. Cadastro de contas recorrentes, com prioridade.
5. Dashboard → Percentual de Liberdade calculado ao vivo, saldo, rendimento, histórico.
6. Saque do principal.

Narração: "Isso não é mockup — é o fluxo rodando na devnet Solana. Você deposita, o sistema
calcula em tempo real quanto da sua liberdade financeira aquele depósito já garante, e o
principal continua seu, disponível a qualquer momento."

Nota técnica pra quem perguntar depois: o cofre Kamino Lend está com o contrato especificado em
`vault/`, hoje testado com um cofre mock (`VAULT_PROVIDER=mock`) porque o oracle Scope que o
Kamino Lend exige não roda em devnet — mainnet é o próximo passo pra capturar APY real.

**[TELA]** Dashboard `/family/dashboard` navegável ao vivo.

---

**Stack:** NestJS 11 · Next.js 16 · React 19 · TypeScript · Prisma 7 · Postgres 16 ·
Solana web3.js · SPL Token · Privy · Kamino Lend.
