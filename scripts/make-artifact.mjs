/**
 * Turns the single-file build into an Artifact page.
 *
 * The Artifact host wraps the file it is given in its own
 * `<!doctype html><head>…</head><body>` skeleton, so this strips our own
 * document scaffolding and emits just the page content: the title, the
 * Google Fonts link (the one external host the Artifact CSP allows), the
 * inlined stylesheet, the mount point and the inlined bundle.
 *
 *   npm run build:single && node scripts/make-artifact.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'dist-single', 'index.html')
const out = path.join(root, 'dist-single', 'artifact.html')

if (!fs.existsSync(src)) {
  console.error('missing ' + src + ' — run `npm run build:single` first')
  process.exit(1)
}

const html = fs.readFileSync(src, 'utf8')

/** Collect every occurrence of a tag, with its contents. */
const all = (re) => [...html.matchAll(re)].map((m) => m[0])

const fonts = all(/<link\b[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g)
const styles = all(/<style\b[\s\S]*?<\/style>/g)
const scripts = all(/<script\b[\s\S]*?<\/script>/g)

if (!scripts.length) {
  console.error('no inlined script found — is vite-plugin-singlefile configured?')
  process.exit(1)
}
if (/<link\b[^>]*\bhref="(?!https:\/\/fonts\.)/.test(html)) {
  console.error('an external stylesheet survived inlining; the Artifact CSP would block it')
  process.exit(1)
}

// The gallery/tab name. Deliberately a short noun phrase rather than the
// page's h1, which is a full sentence.
const TITLE = 'Loop Heat Pipe Operating Point'

const page = [
  `<title>${TITLE}</title>`,
  ...fonts,
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n')

fs.writeFileSync(out, page + '\n')
console.log(
  'wrote ' + path.relative(root, out) + '  (' + (page.length / 1024).toFixed(0) + ' kB, ' +
    fonts.length + ' font links, ' + styles.length + ' style blocks, ' + scripts.length + ' scripts)',
)
