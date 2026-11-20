// Vice Cover Maker, the gta6-cover-art-01 entry (Node 22, standard library only):
// the app is this directory's app/ folder, plain static files a desktop browser
// loads offline (app/index.html and its ES modules, no library and no network
// request), and this program hands it in. It copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library.
//
// The app itself: pick a photo (upload or one of the two model-made samples),
// type a title and tagline, choose a multi-panel layout (poster, split, strip)
// and a colour grade (sunset, neon, noir), and export a 1080 x 1350 or
// 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun
// with an image model and are free to use. No Rockstar logo, artwork or font
// is used anywhere; the lettering is plain system sans-serif drawn by the app.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// One line of my own bookkeeping, printed so a run shows what it handed in.
const appFiles = readdirSync(join(out, 'app')).length;
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.')).length;
console.log(`vice-cover-maker: handed in ${appFiles} top-level app entries and ${shots} screenshots`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
