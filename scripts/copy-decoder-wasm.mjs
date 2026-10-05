import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Puts the camera scanner's decoder WebAssembly under `public/` so the browser
 * fetches it from this app's own origin.
 *
 * `zxing-wasm` resolves its `.wasm` relative to the JS module that loads it,
 * which after bundling means a hashed path under `/_next/static/` that the
 * bundler never emits the binary to. The upstream fallback is a public CDN —
 * no good here: a warehouse terminal may have no route to the internet, and a
 * CDN fetch is the first thing a tightened CSP blocks. So we vendor the file at
 * a stable path and point `locateFile` at it (see `hooks/useBarcodeCamera.js`).
 *
 * Runs from `predev` and `prebuild`. The copy is gitignored and reproducible
 * from the pinned `barcode-detector` version, so it is a build artifact rather
 * than a checked-in binary.
 */

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEST_DIR = resolve(root, 'public/wasm');
const DEST = resolve(DEST_DIR, 'zxing_reader.wasm');

// Resolved through the package's own export map, so a version bump that moves
// the file fails loudly here instead of at runtime on a scanning device.
const source = require.resolve('zxing-wasm/reader/zxing_reader.wasm');

mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(source, DEST);

const kb = Math.round(statSync(DEST).size / 1024);
console.log(`[decoder-wasm] public/wasm/zxing_reader.wasm (${kb} kB)`);
