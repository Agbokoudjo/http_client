import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/**/*.ts',],
    format: ['cjs', 'esm'],
    dts: true,
    // bundle: false est CRUCIAL pour garder la structure des dossiers
    bundle: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: 'esnext',
    outDir: 'dist',
    tsconfig: './tsconfig.json',
    // On gère proprement les extensions pour l'ESM (Node 25 apprécie le .mjs)
    outExtension({ format }) {
        return {
            js: format === 'esm' ? '.mjs' : '.js',
        };
    },
});