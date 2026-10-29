// Builds ONE self-contained HTML file (no CDN scripts) of the app in demo mode.
// Usage: node scripts/build_standalone.mjs <out.html>
// Needs esbuild, react, react-dom, react-icons and tailwindcss v4 in NODE_TOOLS (default /opt/npm-tools/node_modules).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = process.env.NODE_TOOLS || '/opt/npm-tools/node_modules';
const require = createRequire(path.join(TOOLS, 'x.js'));
const esbuild = require('esbuild');
const tw = require(path.join(TOOLS, 'tailwindcss/dist/lib.js'));
const out = process.argv[2] || path.join(root, 'standalone.html');
// --site: a full web page for your own hosting, connected to Supabase (loaded from a CDN at run time)
const SITE = process.argv.includes('--site');
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n').filter((l) => /^VITE_/.test(l)).map((l) => l.split('=').map((x) => x.trim()))
);
const tmp = fs.mkdtempSync(path.join(path.dirname(out), 'sa-'));

// 1) lucide-react shim -> react-icons/lu (same Lucide icon set)
const RENAME = { Home: 'House', Grid2x2: 'Grid2X2', Image: 'Image' };
const names = new Set();
for (const f of walk(path.join(root, 'src'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g))
    m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => names.add(n));
}
const shim = [
  "import * as Lu from 'react-icons/lu';",
  "import { createElement } from 'react';",
  "const wrap = (C) => ({ size = 24, strokeWidth = 2, className = '', ...rest }) => createElement(C, { size, strokeWidth, className, ...rest });",
  ...[...names].map((n) => `export const ${n} = wrap(Lu.Lu${RENAME[n] || n});`),
].join('\n');
fs.writeFileSync(path.join(tmp, 'lucide-shim.js'), shim);
fs.writeFileSync(
  path.join(tmp, 'supabase-stub.js'),
  SITE ? 'export const createClient = (typeof window !== "undefined" && window.supabase && window.supabase.createClient) || null;' : 'export const createClient = null;'
);

// 2) JS bundle
const js = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.jsx')],
  bundle: true,
  write: false,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'swapstyle-i18n',
  loader: { '.css': 'empty', '.js': 'jsx' },
  alias: { 'swapstyle-i18n/jsx-runtime': path.join(root, 'src/i18n/jsx-runtime.js'), 'lucide-react': path.join(tmp, 'lucide-shim.js'), '@supabase/supabase-js': path.join(tmp, 'supabase-stub.js') },
  define: { 'import.meta.env': SITE ? JSON.stringify(env) : '{}', 'process.env.NODE_ENV': '"production"' },
  nodePaths: [TOOLS],
  logLevel: 'warning',
});
const jsCode = js.outputFiles[0].text;

// 3) Tailwind CSS (v4 compiler, theme translated from tailwind.theme.js)
const { theme } = await import(path.join(root, 'tailwind.theme.js'));
const ex = theme.extend;
let themeCss = '@theme {\n';
for (const [name, scale] of Object.entries(ex.colors)) for (const [k, v] of Object.entries(scale)) themeCss += `  --color-${name}-${k}: ${v};\n`;
themeCss += `  --font-sans: ${ex.fontFamily.sans.join(', ')};\n  --font-display: ${ex.fontFamily.display.join(', ')};\n`;
for (const [k, v] of Object.entries(ex.boxShadow)) themeCss += `  --shadow-${k}: ${v};\n`;
for (const [k, v] of Object.entries(ex.animation)) themeCss += `  --animate-${k}: ${v};\n`;
themeCss += '}\n';
for (const [k, frames] of Object.entries(ex.keyframes)) {
  themeCss += `@keyframes ${k} {` + Object.entries(frames).map(([p, d]) => `${p}{${Object.entries(d).map(([a, b]) => `${a}:${b}`).join(';')}}`).join('') + '}\n';
}
const twDir = path.join(TOOLS, 'tailwindcss');
const input = `@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);\n@import "tailwindcss/utilities.css" layer(utilities);\n${themeCss}`;
const compiler = await tw.compile(input, {
  base: root,
  loadStylesheet: async (id) => {
    const file = path.join(twDir, id.replace(/^tailwindcss\//, ''));
    return { path: file, base: twDir, content: fs.readFileSync(file, 'utf8') };
  },
});
const candidates = new Set();
for (const f of walk(path.join(root, 'src'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/[^\s"'`{}()<>;,]+/g)) candidates.add(m[0]);
const appCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8').replace(/@tailwind[^;]*;\n?/g, '');
const css = compiler.build([...candidates]) + '\n' + appCss;

// 4) Page
const favicon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'public/favicon.svg')).toString('base64');
const head = SITE
  ? `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SwapStyle">
<meta name="description" content="SwapStyle — swap clothes you no longer wear for something new. Zero cost, zero waste.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-192.png">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js"></script>
<script>if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>
`
  : '';
const html = head + `<title>SwapStyle</title>
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&family=Heebo:wght@300;400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
<div id="root"></div>
<script>
${jsCode.replace(/<\/script/gi, '<\\/script')}
</script>
` + (SITE ? '</head>\n</html>\n' : '');
fs.writeFileSync(out, html);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote', out, (html.length / 1024).toFixed(0) + 'KB', 'icons:', names.size);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}
