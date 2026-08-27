/**
 * Populate Observable Framework's npm cache from the npm registry.
 *
 * Framework resolves `npm:` imports — including its own internals, `htl`,
 * `isoformat` and `katex` — by fetching pre-bundled ESM from jsDelivr at
 * build time. Where jsDelivr is unreachable (an offline machine, a sandbox
 * or a network policy that allows only the registry) the build cannot
 * start. This installs the same packages from the registry, bundles them to
 * ESM with esbuild, and writes them into the cache layout Framework looks in,
 * so `observable build` finds everything already there.
 *
 *   npm run vendor && npm run build      # or: npm run build:offline
 *
 * Where jsDelivr *is* reachable this is unnecessary — Framework populates
 * the same cache itself.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = path.join(root, 'src', '.observablehq', 'cache', '_npm')
const entries = path.join(root, '.vendor-entries')

/**
 * The modules Framework asks jsDelivr for. Versions are the ones Framework
 * 1.13 resolves; if a build still reports an unfetchable module, add it here
 * with the version named in the error.
 */
const PACKAGES = [
  { name: 'htl', version: '1.0.0', hasDefault: false },
  { name: 'isoformat', version: '0.2.1', hasDefault: false },
  { name: 'katex', version: '0.18.4', hasDefault: true, assets: ['dist/katex.min.css', 'dist/fonts'] },
]

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })

function main() {
  fs.mkdirSync(entries, { recursive: true })

  const specs = PACKAGES.map((p) => `${p.name}@${p.version}`)
  console.log('installing from the registry: ' + specs.join(' '))
  run('npm', ['install', '--no-save', '--no-audit', '--no-fund', ...specs])

  const esbuild = path.join(root, 'node_modules', '.bin', 'esbuild')
  if (!fs.existsSync(esbuild)) {
    console.error('esbuild not found — run `npm install` first')
    process.exit(1)
  }

  for (const pkg of PACKAGES) {
    const dir = path.join(cache, `${pkg.name}@${pkg.version}`)
    fs.mkdirSync(dir, { recursive: true })

    // esbuild needs a real entry file inside the project to resolve the
    // package the same way the bundler would.
    const entry = path.join(entries, `${pkg.name}.js`)
    fs.writeFileSync(
      entry,
      pkg.hasDefault
        ? `export * from ${JSON.stringify(pkg.name)};\nimport d from ${JSON.stringify(pkg.name)};\nexport default d;\n`
        : `export * from ${JSON.stringify(pkg.name)};\n`,
    )

    run(esbuild, [entry, '--bundle', '--format=esm', '--minify', `--outfile=${path.join(dir, '_esm.js')}`])

    // Some packages are also requested by subpath (KaTeX's stylesheet and
    // its fonts); those are copied across verbatim.
    for (const asset of pkg.assets ?? []) {
      const from = path.join(root, 'node_modules', pkg.name, asset)
      const to = path.join(dir, asset)
      if (!fs.existsSync(from)) {
        console.warn(`  ! missing asset ${pkg.name}/${asset}`)
        continue
      }
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.cpSync(from, to, { recursive: true })
    }

    const size = fs.statSync(path.join(dir, '_esm.js')).size
    console.log(`  ${pkg.name}@${pkg.version}  ${(size / 1024).toFixed(0)} kB`)
  }

  fs.rmSync(entries, { recursive: true, force: true })
  console.log('cache ready at src/.observablehq/cache/_npm')
}

main()
