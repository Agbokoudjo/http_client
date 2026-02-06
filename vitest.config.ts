import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environnement de test
    environment: 'jsdom', 
    
    // Fichiers de setup
    setupFiles: ['./tests/setup.ts'],
    
    // Couverture de code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**'
      ],
      include: ['src/**/*.ts']
    },
    
    // Globaux (évite d'importer describe, it, expect dans chaque fichier)
    globals: true,
    
    // Watch mode
    watch: false,
    
    // Reporters
    reporters: ['verbose'],
    
    // Timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Isolation
    isolate: true,
    
    // Include/exclude patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'build'],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});