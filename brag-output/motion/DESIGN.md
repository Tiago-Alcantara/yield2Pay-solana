---
name: Yield2Pay
version: 1
colors:
  background: "#0c0d0f"
  surface: "#131417"
  card: "#1A1C1F"
  well: "#16181b"
  metal-gradient: "linear-gradient(135deg,#3c3f44 0%,#26282c 26%,#16181b 52%,#303338 74%,#1b1d21 100%)"
  metal-grain: "repeating-linear-gradient(118deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 1px,transparent 4px)"
  sweep: "linear-gradient(90deg,transparent,rgba(255,255,255,.26),transparent)"
  silver: "#C0C2C5"
  silver-bright: "#D4D6D9"
  chrome: "linear-gradient(180deg,#E6E8EA,#A8AAAD)"
  chrome-ink: "#0E0F11"
  border: "#2A2D31"
  border-metal: "#4a4d52"
  text: "#EDEFF1"
  text-strong: "#F2F3F4"
  text-secondary: "#9A9DA1"
  text-tertiary: "#8a8d91"
fonts:
  display: "Hanken Grotesk, 700, tracking -0.03em"
  body: "Hanken Grotesk, 400-500"
  data: "Geist Mono (every number, label, eyebrow and balance)"
radii:
  chip: 12
  card: 18
  panel: 24
  pill: 999
---

# Yield2Pay: design para vídeo

**Estética:** banco privado, digital. Monocromático, preto quase puro com prata polida. O material
assinatura é o **metal escovado**: painéis com gradiente de metal, grão diagonal fino, borda de 1px
`#4a4d52`, brilho interno no topo e uma faixa de luz (**sweep**) que atravessa a superfície devagar.
A sensação é de cartão de metal ou de extrato de private bank, não de startup cripto barulhenta.

## Regras
- **Monocromático apenas.** Nada de roxo da Solana, azul neon ou verde berrante. A elegância vem do
  contraste preto/prata e do espaço negativo.
- **Duas fontes.** Hanken Grotesk para títulos e texto (títulos em 700, tracking apertado). Geist
  Mono para todo número, rótulo, eyebrow e saldo. Eyebrows ficam em MAIÚSCULAS com letter-spacing
  largo (0,16–0,2em) e em prata `#C0C2C5`.
- **Botão primário cromado:** gradiente `#E6E8EA → #A8AAAD`, texto `#0E0F11`.
- **Barra de cobertura:** trilho `#16181b` com preenchimento em cromo `linear-gradient(90deg,#A8AAAD,#E6E8EA)`.
- **Marca:** um losango prateado (quadrado girado 45°, gradiente `#E6E8EA → #9A9DA1`, glow suave)
  seguido do wordmark "Yield2Pay" em Hanken Grotesk 700.
- **Movimento contido:** entradas em fade com deslocamento curto. A vida vem do sweep de luz no
  metal e de uma flutuação lenta. O fundo fica parado, com no máximo um radial suave `#1b1d20` no
  topo.
- **Sem emoji. Sem ícones preenchidos.** Só `◆` como marcador e `·` como separador.
- **Voz:** calma, direta, segunda pessoa ("você / seu"). Sem hype, sem exclamação.
- **Números** sempre em Geist Mono, formato brasileiro: `R$ 283,80`, `R$ 60.000`, `8% a.a.`.
- **Conformidade:** o rendimento é variável e pode ser zero. Nunca prometa retorno. Mostre a nota
  "Simulação com cenário escolhido por você. Não é promessa de resultado." quando houver números de
  simulação.
