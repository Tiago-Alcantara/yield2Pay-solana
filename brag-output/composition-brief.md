# Hyperframes Composition Brief: Yield2Pay

## Objective
Create a short launch-style brag video for Yield2Pay (vertical "para famílias"), in PT-BR.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 23.5 seconds

## Source Material
- Project root: repository root (`yield2Pay-solana`)
- Primary files read: `apps/web/src/app/family/page.tsx` (landing + calculadora),
  `_lib/familyI18n.ts` (copy PT), `_lib/familyMath.ts` (Percentual de Liberdade),
  `_lib/familyFormat.ts`, `_lib/familyTheme.ts`, `_components/FamilyUI.tsx` (MetalPanel,
  CoverageBar, BrandDiamond), `app/tokens/*.css`, `app/globals.css` (brushed/sweep),
  `dashboard/page.tsx`, `README.md`, `design/docs/DESIGN-SYSTEM.md`
- Product name: Yield2Pay
- Tagline / strongest claim: "O rendimento do seu próprio dinheiro paga suas assinaturas."
- Key UI or visual moment to recreate: the landing calculator (chips "Assinaturas da casa",
  slider "Quanto você já teria depositado", pill "8% a.a.", MetalPanel "Percentual de liberdade"
  counting to 100% with the chrome coverage bar) and the hero card "Este mês" with the rows marked
  "pago"; the dashboard StatCard "Seu saldo depositado".
- Copy that must appear verbatim:
  - Esse dinheiro sai e não volta. (README)
  - O rendimento do seu próprio dinheiro paga suas assinaturas.
  - Percentual de liberdade
  - Neste cenário, todas as suas assinaturas estariam cobertas.
  - Simulação com cenário escolhido por você. Não é promessa de resultado.
  - pagos pelo rendimento do seu depósito
  - Seu saldo depositado / Continua seu. Saque quando quiser.
  - As contas se pagam
  - E o dinheiro continua sendo seu. (README)
  - O rendimento gerado é variável e pode ser zero.
  - Não-custodial · Saque quando quiser · Sem mensalidade

## Creative Direction
- Tone preset: polished
- Creative direction: filme de produto de private bank em prata escovada: "as contas que se pagam
  sozinhas"
- Interpretation: poucas cenas com holds generosos, entradas rápidas e assentamento suave,
  crossfades, SFX mínimos. O material (metal escovado e sweep de luz) carrega a sofisticação.
- Angle: toda fintech promete fazer o dinheiro render; a Yield2Pay transforma rendimento em contas
  pagas. Começa na pilha de mensalidades que "sai e não volta" e vira a conta ao contrário com a
  própria calculadora do produto.
- Hook: três contas (Netflix R$ 59,90 · Spotify Família R$ 34,90 · Escola de inglês R$ 189,00)
  empilham, o contador sobe até R$ 3.405 "em 12 meses" e entra "Esse dinheiro sai e não volta."
- Outro / punchline: logo + "E o dinheiro continua sendo seu."
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Solana purple, neon, emoji, filled icons (brand is strictly monochrome black + silver)
  - Any promise of return. The yield is variable and can be zero.

## Visual Identity
- Background: `#0c0d0f` with a static radial `#1b1d20` at the top (the brand says the background
  never animates)
- Text: `#EDEFF1`, numbers `#F2F3F4`, secondary `#9A9DA1`, on metal `#C8CACD` / `#C0C2C5`
- Accent: silver `#C0C2C5`; chrome `linear-gradient(180deg,#E6E8EA,#A8AAAD)`; coverage fill
  `linear-gradient(90deg,#A8AAAD,#E6E8EA)`
- Display font: Hanken Grotesk (local woff2 400/500/600/700, from @fontsource, OFL)
- Body font: Hanken Grotesk + Geist Mono for all numbers/labels (local woff2 400/500/600, OFL)
- Visual references from the project: MetalPanel (`.brushed` + `.sweep`), BrandDiamond, CoverageBar,
  chips da calculadora, PillGroup "8% a.a.", StatusPill, emboss text-shadow

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. A pilha de mensalidades — 4.0s (0.0–4.0) — 3 contas + contador R$ 3.405 + "Esse dinheiro sai e não volta."
2. A virada — 4.7s (4.0–8.7) — losango + Yield2Pay + headline do hero + selos
3. Seu percentual de liberdade — 5.5s (8.7–14.2) — calculadora, slider até R$ 60.000, 0% → 100%
4. As contas se pagam — 5.2s (14.2–19.4) — "Este mês" soma conta a conta + "pago"; saldo continua seu
5. O dinheiro continua seu — 4.1s (19.4–23.5) — logo, punchline, selos, disclaimer

## Audio
- Audio role: warm bed + sparse professional accents
- Audio arc: entra discreta sob as contas, ganha corpo na virada e na calculadora, pontua 100% e os
  selos "pago", sai em fade sob o sino do logo
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume 0.32, fade-in 0–0.6s, fade-out 22.3–23.5s (volume lane)
- Music cue guidance: bundled preset
  `<brag-skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`
  (109.96 BPM). Strong cues used: 8.74 (scene 3 entrance), 10.93 (100%), 19.66 (logo lands).
  Beat-grid: "pago" stamps at 14.73 / 15.84 / 16.93 (every other beat, readable); balance card at
  17.47 (strong cue).
- Audio-reactive treatment: subtle. Pre-extracted RMS (`extract-audio-data.py`, 30 fps, smoothed)
  drives the metal sweep intensity and the brand-diamond glow. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1 bills — soft drops as each bill lands
  - Scene 2 diamond — warm bong
  - Scene 3 slider grab — click; 100% — soft bell
  - Scene 4 "pago" ×3 — soft warm thuds
  - Scene 5 logo — bell, music fades under it
- SFX selection guidance: low/medium HF-risk only (sfx-analysis.md). Volumes 0.35–0.6.
- Exact SFX choice: `interface/drop_001-003`, `interface/bong_001`, `ui/click2`,
  `impact/impactBell_heavy_000`, `impact/impactSoft_medium_001/002/004`, `impact/impactBell_heavy_003`
- Audio files: copied into `brag-output/composition/assets/`
- Delivery mastering: after render, two-pass `loudnorm` to -16 LUFS / -1.5 dBTP in the same ffmpeg
  pass that bakes the poster as frame 0 (the raw mix measured -25 LUFS; the bed/SFX balance is kept)

## Hyperframes Instructions
Domain skills loaded: hyperframes-core, hyperframes-animation, hyperframes-creative,
hyperframes-keyframes, hyperframes-cli. /brag is its own workflow: the entry-point intent interview
and the generic launch-video route were not used. Native Hyperframes conventions take precedence.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Treat music cue metadata as optional timing hints.
- Run `hyperframes check` before render; it is brag's single gate.
- Keep creation and rendering local.
