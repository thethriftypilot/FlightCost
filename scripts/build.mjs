import { build } from 'esbuild';

await build({
  entryPoints: ['electron/main.ts'],
  outfile: 'build/main.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron', 'node:sqlite'],
});
await build({
  entryPoints: ['electron/preload.ts'],
  outfile: 'build/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
});
