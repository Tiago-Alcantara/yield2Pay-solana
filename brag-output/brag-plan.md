# Brag Plan: Yield2Pay

> Gerado com `/brag --full` (workflow clássico com Hyperframes). Fonte: código do repositório
> (`apps/web/src/app/family/*`, `familyI18n.ts`, `familyMath.ts`, tokens de design, README).
> Uma segunda versão do vídeo é produzida pelo Motion a partir deste mesmo plano.

## Rubrica (passo 1)

1. **O que é o app?** Você deposita uma vez, o dinheiro rende num cofre DeFi não-custodial na
   Solana, e **só o rendimento** paga as assinaturas da casa. O principal continua seu, e você
   saca quando quiser.
2. **A afirmação mais forte:** "O rendimento do seu próprio dinheiro paga suas assinaturas."
   E o Percentual de Liberdade chegando a 100%, quando as assinaturas "se pagam sozinhas".
3. **Gancho visual:** painéis de metal escovado prateado com o brilho (sweep) atravessando, sobre
   quase-preto `#0c0d0f`. A barra de cobertura em cromo e os números em Geist Mono.
4. **UI real a mostrar:** a calculadora "Seu percentual de liberdade" (chips de assinatura, slider
   de depósito e o painel de metal contando até 100%) e o card "Este mês" com R$ 283,80
   "pagos pelo rendimento do seu depósito", Netflix, Spotify Família e Escola de inglês marcados
   como "pago". Também o "Seu saldo depositado" do dashboard.
5. **Vídeo mais curto que funciona:** cerca de 23 s. O problema (a pilha de mensalidades), a
   virada (o rendimento paga), a prova (100%) e o fecho (o dinheiro continua seu).
6. **Tom:** preset `polished`, direção "filme de produto de private bank em prata escovada: as
   contas que se pagam sozinhas".
7. **Áudio:** uma trilha limpa e constante (vol-12) em volume de fundo, com SFX raros e precisos:
   cartas pousando nas contas, cliques nos chips e no slider, um sino discreto no 100% e no logo.
   Áudio-reativo sutil: o brilho do metal respira com a música.
8. **Legenda:** "Yield2Pay: você deposita uma vez e o rendimento paga Netflix, Spotify e a escola
   de inglês. O principal continua seu."
9. **Fluxo do usuário:** marca as assinaturas da casa → arrasta "Quanto você já teria depositado"
   até R$ 60.000 no cenário de 8% a.a. → Percentual de liberdade 100% → "Este mês": as contas
   aparecem pagas pelo rendimento e o saldo continua seu.

## What is this app?
Uma ferramenta de pagamento não-custodial na Solana. Você deposita uma vez e só o rendimento paga
Netflix, Spotify e a escola de inglês. O principal nunca é gasto.

## The angle
Toda fintech promete fazer seu dinheiro render. A Yield2Pay faz uma coisa mais concreta: transforma
o rendimento em contas pagas. O vídeo começa no lugar onde todo mundo está (a pilha de
mensalidades que sai e não volta) e vira a conta ao contrário, com a própria calculadora do produto
provando que, num cenário escolhido por você, as assinaturas se pagam sozinhas. O tom é de banco
privado: sóbrio, prateado, confiante, sem barulho de cripto.

## Hook (first 2-3 seconds)
Três contas reais da casa empilham como cartões, cada uma com o seu valor: Netflix R$ 59,90,
Spotify Família R$ 34,90, Escola de inglês R$ 189,00. Um contador em mono sobe até **R$ 3.405**
("em 12 meses") e a frase do README fecha o gancho: **"Esse dinheiro sai e não volta."**

## Key moments (the middle)
- O losango prateado gira, o brilho atravessa o metal e a headline do produto entra inteira:
  "O rendimento do seu próprio dinheiro paga suas assinaturas."
- A calculadora real: o slider "Quanto você já teria depositado" corre até R$ 60.000 e o
  painel "Percentual de liberdade" conta de 0% a **100%** enquanto a barra de cromo enche.
  Linha final: "Neste cenário, todas as suas assinaturas estariam cobertas."
- O card "Este mês": R$ 283,80 "pagos pelo rendimento do seu depósito", e as três contas recebem
  o selo "pago" uma por uma. Ao lado, "Seu saldo depositado: R$ 60.000. Continua seu. Saque
  quando quiser."

## Outro / punchline
Logo Yield2Pay com o losango, a frase **"E o dinheiro continua sendo seu."** e os selos
"Não-custodial · Sem mensalidade". Em letra pequena: "O rendimento gerado é variável e pode ser
zero."

## User flow worth showing
1. **Entrada:** "Assinaturas da casa" com Netflix, Spotify Família e Escola de inglês marcadas
   (o total de R$ 283,80/mês vem do README).
2. **Ação-chave:** o slider de depósito vai a R$ 60.000 no cenário "8% a.a.".
3. **Resultado:** Percentual de liberdade 100%. "Este mês" mostra as três contas pagas pelo
   rendimento e o saldo depositado intacto.

## Tone
- Preset: polished
- Creative direction: filme de produto de private bank em prata escovada, "as contas que se pagam
  sozinhas"
- Interpretation: poucas cenas com holds generosos, entradas rápidas (0,3–0,6 s) e assentamento
  suave, transições em crossfade/slide macio, SFX mínimos. A confiança vem da contenção e do
  material (metal escovado), não de efeitos.

## Format: landscape — 1920x1080
## Duration: 23.5 s

## Visual identity (from the project)
- Background: `#0c0d0f` (`--fx-bg`), com radial `#1b1d20 → #0c0d0f` no topo
- Accent: prata `#C0C2C5` (`--fx-silver`), cromo `linear-gradient(180deg,#E6E8EA,#A8AAAD)`
- Text: `#EDEFF1` (`--fx-text`) e `#F2F3F4` para números; secundário `#9A9DA1`
- Superfícies: card `#1A1C1F`, well `#16181B`, borda `#2A2D31`, borda de metal `#4a4d52`
- Metal escovado: `linear-gradient(135deg,#3c3f44 0%,#26282c 26%,#16181b 52%,#303338 74%,#1b1d21 100%)`
  com grão diagonal e o sweep `rgba(255,255,255,.26)`
- Display font: Hanken Grotesk (700 nos títulos, tracking -0,03em)
- Body font: Hanken Grotesk e Geist Mono para números, labels e eyebrows (maiúsculas, tracking
  0,12–0,2em)
- Strongest visual element: o MetalPanel com sweep (hero card e painel do percentual de liberdade)
  e o losango prateado da marca

## Share copy (draft)
Yield2Pay: você deposita uma vez e o rendimento paga Netflix, Spotify e a escola de inglês. O
principal continua seu, numa carteira não-custodial na Solana.

## Audio direction
- Role: trilha de apoio limpa (warm bed) com acentos profissionais esparsos
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (steady and clean, 109,96 BPM)
- Music treatment: começa em 0 s com fade-in curto (0,6 s), volume de fundo ~0,32, fade-out nos
  últimos ~1,2 s, deixando o sino do logo soar por cima. Masterização final: loudnorm em -16 LUFS
  (true peak -1,5 dBTP), mantendo o equilíbrio entre trilha e SFX.
- Music cue guidance: preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`.
  Strong cues para travar: **8,74 s** (entrada da calculadora), **10,93 s** (o percentual chega a
  100%), **19,66 s** (o logo assenta). Beat-grid para os selos "pago": 14,73 / 15,84 / 16,93 s
  (um beat sim, um não, para dar tempo de leitura) e o sweep no saldo em 17,47 s (strong cue). Cartas do gancho em 0,56 / 1,09 / 1,64 s são
  rápidas demais para texto. Entram rápido e o conjunto fica na tela.
- Audio-reactive treatment: sutil. O RMS/graves da trilha modulam a intensidade do sweep e o
  brilho do losango e da borda dos painéis de metal. Sem waveform nem equalizador.
- SFX posture: esparso, motion-matched, volume 0,55–0,7
- Audio-coupled moments: cartas das contas pousando, contador subindo, clique nos chips, slider
  correndo, chegada do 100%, selos "pago", logo final
- Restraint rule: nada de impacto pesado nem glitch. É um produto financeiro sério e o som não pode
  soar como cassino ou cripto barulhento.

## Storyboard

### Scene 1 — A pilha de mensalidades — 4.0s (0,0–4,0)
Fundo quase-preto. Três cards de conta (estilo das linhas da calculadora: quadradinho, nome,
valor em mono) empilham à esquerda: Netflix R$ 59,90 → Spotify Família R$ 34,90 → Escola de
inglês R$ 189,00, com "Total de R$ 283,80 por mês" embaixo. À direita, o contador em Geist Mono
sobe até **R$ 3.405**, com o label "em 12 meses". Depois entra a frase "Esse dinheiro sai e não
volta." (hold de 1,8 s).
Sequential/interaction: sim. As 3 contas entram uma por uma (0,2 / 0,5 / 0,8 s) e ficam na tela.
O contador conta de R$ 0 a R$ 3.405 (0,9–1,65 s) e a frase entra em 1,4 s.
Audio intent: tensão leve e familiar, o "boleto do mês"
Audio-coupled idea: card-place a cada conta, ticks discretos no contador
Music: trilha entra em fade-in
Transition mood: soft → Scene 2 (as contas deslizam/apagam, o metal acende)

### Scene 2 — A virada — 4.7s (4,0–8,7)
O losango prateado da marca gira e assenta. O sweep atravessa um painel de metal e o wordmark
"Yield2Pay" aparece com o eyebrow "Yield2Pay · Solana". A headline do hero entra inteira e segura
por cerca de 3 s: **"O rendimento do seu próprio dinheiro paga suas assinaturas."** Selos em mono
abaixo: "◆ Não-custodial ◆ Saque quando quiser ◆ Sem mensalidade".
Sequential/interaction: os selos entram um a um, rápido, e ficam
Audio intent: alívio, a virada da conta
Audio-coupled idea: um "bong" suave no losango
Transition mood: soft slide → Scene 3 (travado no strong cue de 8,74 s)

### Scene 3 — Seu percentual de liberdade — 5.5s (8,7–14,2)
Recriação da calculadora da landing. À esquerda, o card "Assinaturas da casa" com os chips Netflix,
Spotify Família e Escola de inglês marcados (cromo) e Academia, Disney+ e Plano de celular
desmarcados. Abaixo, o slider "Quanto você já teria depositado" corre de R$ 0 a **R$ 60.000** e a
pílula "8% a.a." fica selecionada. À direita, o MetalPanel "Percentual de liberdade" conta 0% →
**100%** enquanto a barra de cromo enche. Os 100% chegam em 10,93 s, quando o depósito cruza
R$ 42.570. Linhas: "Suas assinaturas R$ 283,80", "Coberto no cenário R$ 283,80", "Depósito para
chegar a 100% R$ 42.570". Como o slider anda de R$ 1.000 em R$ 1.000, os 100% aparecem em
R$ 43.000, igual à landing (em R$ 42.000 ela mostra 99%). Frase: "Neste cenário, todas as suas
assinaturas estariam cobertas."
(hold de pelo menos 2,4 s). Nota pequena: "Simulação com cenário escolhido por você. Não é
promessa de resultado."
Sequential/interaction: sim. Um cursor arrasta o slider e o número conta junto.
Audio intent: confiança crescente
Audio-coupled idea: clique ao pegar o slider, sino suave na chegada dos 100%
Transition mood: soft crossfade → Scene 4

### Scene 4 — As contas se pagam — 5.2s (14,2–19,4)
À esquerda, "Como funciona · 03", o título do passo 3 da landing, **"As contas se pagam"**, e o
card do dashboard "Seu saldo depositado": **R$ 60.000**, "Continua seu. Saque quando quiser."
(na tela desde 14,55 s, com o sweep passando em 17,47 s). À direita, o card "Este mês" no estilo
do hero (MetalPanel com sweep), com "pagos pelo rendimento do seu depósito" e as linhas Netflix,
Spotify Família e Escola de inglês. Cada linha recebe o selo "pago" (14,73 / 15,84 / 16,93 s) e o
total soma conta a conta: R$ 59,90 → R$ 94,80 → **R$ 283,80**, com a barra enchendo junto.
Rodapé do card: "Exemplo ilustrativo".
Sequential/interaction: sim. Os 3 selos "pago" entram um por um, em beats alternados.
Audio intent: satisfação contida
Audio-coupled idea: drop suave a cada "pago", acento leve no card do saldo
Transition mood: soft → Scene 5

### Scene 5 — O dinheiro continua seu — 4.1s (19,4–23,5)
Losango e wordmark "Yield2Pay" grandes, assentando em 19,66 s. Embaixo: **"E o dinheiro continua
sendo seu."** Selos: "Não-custodial · Sem mensalidade". Disclaimer pequeno: "O rendimento gerado é
variável e pode ser zero." O sweep passa uma última vez pelo logo.
Sequential/interaction: nenhuma
Audio intent: assinatura final, calma
Audio-coupled idea: sino do logo em 19,66 s, música em fade-out por baixo
Music: fade-out nos últimos ~1,2 s

**Music mood for this video:** cinematic-clean, upbeat contido
**Audio summary:** a trilha entra discreta sob a pilha de contas, ganha corpo na virada e na
calculadora, pontua os 100% e os selos "pago" com acentos leves, e sai em fade sob o sino do logo.

## Notas de veracidade
- Todos os números vêm do projeto: R$ 59,90, R$ 34,90 e R$ 189,00 (README e `familyI18n.ts`),
  R$ 283,80/mês e R$ 3.405 em 12 meses (README), cenário de 8% a.a. e depósito padrão de
  R$ 60.000 (`page.tsx`). R$ 42.570 é o resultado de `depositForMonthly(283,80, 8)`.
- As cenas mostram a simulação da landing, que roda no cliente e é ilustrativa, com os disclaimers
  do próprio produto. Nenhum dado real de usuário, carteira ou endereço aparece.
