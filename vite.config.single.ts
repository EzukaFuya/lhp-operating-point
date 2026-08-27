import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Builds the whole app into one self-contained `dist-single/index.html`
 * with every script and stylesheet inlined. Used for the shareable
 * Artifact build, which may not load assets from other hosts.
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
