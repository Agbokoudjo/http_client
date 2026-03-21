import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        core: 'src/core/index.ts',
        contracts: 'src/contracts/index.ts',
        types: 'src/types/index.ts',
        events: 'src/events/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    bundle: true,
    splitting: false,
    clean: true,
    minify: false, // Recommandé pour une lib client HTTP
    sourcemap: true,
    // CRITIQUE : On ne bundle pas le dispatcher, on le laisse en dépendance externe
    external: ['@wlindabla/event_dispatcher'],
    outExtension({ format }) {
        return { js: format === 'esm' ? '.mjs' : '.js' };
    },
});