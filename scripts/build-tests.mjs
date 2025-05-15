import { build } from 'esbuild';

build({
  entryPoints: ['tests/test-mylaps-forwarder.ts'],
  bundle: true,
  platform: 'node',
  outfile: '.build/test-mylaps-forwarder.js',
  sourcemap: true,
  external: ['electron'],
});
