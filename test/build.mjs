/**
 * Bundles the TypeScript model to plain ESM so `node --test` can import it.
 * The page's own build goes through Observable Framework; this is only for
 * the tests, which exercise the model directly and never touch the DOM.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'test', '.build')
const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild')

export const ENTRIES = {
  model: 'src/components/model/solve.ts',
  properties: 'src/components/model/properties.ts',
  constants: 'src/components/model/constants.ts',
  verdict: 'src/components/verdict.ts',
  exports: 'src/components/exports.ts',
  processes: 'src/components/model/processes.ts',
  scale: 'src/components/model/scale.ts',
}

export function buildOnce() {
  fs.mkdirSync(outDir, { recursive: true })
  for (const [name, entry] of Object.entries(ENTRIES)) {
    execFileSync(
      esbuild,
      [entry, '--bundle', '--format=esm', '--platform=neutral', `--outfile=${path.join(outDir, name + '.mjs')}`],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
    )
  }
  return outDir
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOnce()
  console.log('test bundles written to test/.build')
}
