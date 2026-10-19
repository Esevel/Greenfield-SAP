import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

function collectFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(filePath, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [filePath] : [];
  });
}

const htmlFiles = [
  resolve(projectRoot, 'index.html'),
  resolve(projectRoot, 'login.html'),
  ...collectFiles(resolve(projectRoot, 'pages'), '.html'),
  ...collectFiles(resolve(projectRoot, 'templates'), '.html')
];
const scriptFiles = collectFiles(resolve(projectRoot, 'scripts'), '.js');

const input = Object.fromEntries(htmlFiles.map((filePath) => [
  relative(projectRoot, filePath)
    .split(sep)
    .join('/')
    .replace(/\.html$/, ''),
  filePath
]));

export default defineConfig({
  root: projectRoot,
  plugins: [{
    name: 'emit-classic-scripts',
    transformIndexHtml(html) {
      return html.replace('</head>', '  <script src="/scripts/auth.js"></script>\n</head>');
    },
    generateBundle() {
      for (const filePath of scriptFiles) {
        this.emitFile({
          type: 'asset',
          fileName: relative(projectRoot, filePath).split(sep).join('/'),
          source: readFileSync(filePath)
        });
      }
    }
  }],
  build: {
    rollupOptions: { input }
  },
  server: {
    port: 3000,
    open: true
  }
});
