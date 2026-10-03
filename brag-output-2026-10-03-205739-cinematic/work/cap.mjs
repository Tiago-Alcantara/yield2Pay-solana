import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1920,height:1080} });
await p.goto('file://'+process.cwd()+'/video.html'); await p.evaluate(()=>document.fonts.ready);
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const N = 1200;
const START=+(process.env.START||0),END=+(process.env.END||N);
for (let f=START; f<END; f++) {
  const t=f/60; if (only && !only.includes(f)) continue;
  await p.evaluate(t=>window.render(t), t);
  await p.screenshot({ path: `frames/${String(f).padStart(4,'0')}.png` });
}
await b.close();
