# Vídeo de lançamento da Yield2Pay (`/brag --full`)

Vídeo de 23,5 s (1920×1080, PT-BR) gerado com o workflow completo do plugin
[brag](https://github.com/latent-spaces/brag) v0.4.0 e composto com
[Hyperframes](https://hyperframes.heygen.com/) 0.8.106.

| Arquivo | O que é |
|---|---|
| `brag.mp4` | o vídeo final. O poster está gravado no frame 0 e o áudio está em -16 LUFS |
| `brag.jpg` | o poster (cena "As contas se pagam", 18,7 s) |
| `share-copy.txt` | a legenda para postar |
| `brag-plan.md` | rubrica, ângulo, storyboard e direção de áudio |
| `composition-brief.md` | o brief entregue ao Hyperframes |
| `composition/` | o projeto Hyperframes (`index.html` + assets) |
| `motion/` | o brief e o DESIGN.md da versão feita no Motion |

## Re-renderizar

A trilha (`happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`) não é duplicada aqui. Ela já
está no repositório, dentro da skill brag vendorizada. Na raiz do repo, copie a trilha para a
composição antes de renderizar:

```bash
mkdir -p brag-output/composition/assets/music
cp .claude/skills/brag/assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 \
  brag-output/composition/assets/music/
cd brag-output/composition
npx hyperframes@0.8.106 check
npx hyperframes@0.8.106 render --quality delivery --output ../brag.mp4
```

Depois do render, o passo 4 do brag escolhe o poster e o grava como frame 0. Aqui o mesmo passo
também normaliza o áudio para -16 LUFS, porque a mixagem crua mede cerca de -25 LUFS. Rode na
pasta `brag-output/`:

```bash
ffmpeg -ss 18.7 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg
# 1ª passada: medir (anote input_i, input_tp, input_lra, input_thresh e target_offset)
ffmpeg -i brag.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -vn -f null -
# 2ª passada: poster no frame 0 + loudnorm com os valores medidos
ffmpeg -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v];[0:a]loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k \
  -t 23.5 -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

## Créditos dos assets

- Fontes Hanken Grotesk e Geist Mono (SIL OFL 1.1, via @fontsource), com as licenças em
  `composition/assets/fonts/`
- SFX: Kenney (CC0), via plugin brag
- Música: "Happy Beats / Business Moves" vol. 12, de ende.app, via plugin brag
- GSAP 3.14.2 (licença padrão da GreenSock), em `composition/assets/vendor/`
