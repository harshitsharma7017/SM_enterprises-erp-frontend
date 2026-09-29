import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithOxc } from 'vite';

const root = fileURLToPath(new URL('./', import.meta.url)).replace(/\/$/, '');

/**
 * This project writes JSX inside plain `.js` files, which Next.js/SWC handles
 * but Vite's oxc transform rejects: it picks the parser from the file
 * extension, and Vite's `oxc` config option deliberately omits `lang`.
 *
 * So transform those files ourselves before oxc sees them. `@vitejs/plugin-react`
 * is intentionally not used — it conflicts with a `pre` JSX transform (by the
 * time it runs the JSX is already gone, so it cannot inject its refresh
 * preamble), and fast refresh has no value in a test run anyway.
 */
function jsxInJsPlugin() {
  return {
    name: 'erp:jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      const [filepath] = id.split('?');
      if (!filepath.endsWith('.js') || filepath.includes('/node_modules/')) return null;
      // Cheap sniff: skip files with no JSX so plain modules stay untouched.
      if (!/<[A-Za-z/>]/.test(code)) return null;

      const result = await transformWithOxc(code, filepath, {
        lang: 'jsx',
        jsx: { runtime: 'automatic', importSource: 'react' },
      });

      return { code: result.code, map: result.map ?? null };
    },
  };
}

export default defineConfig({
  plugins: [jsxInJsPlugin()],
  resolve: {
    // Mirrors the `@/*` -> `./*` alias in jsconfig.json.
    alias: { '@': root },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
    css: false,
  },
});
