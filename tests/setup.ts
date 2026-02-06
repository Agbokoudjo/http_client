import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills pour Node.js
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder as any;
}

// Mock de fetch si pas disponible (Node.js < 18)
if (typeof global.fetch === 'undefined') {
    global.fetch = vi.fn();
}

// Mock de console pour éviter les logs pendant les tests
global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

// Timeout global pour tous les tests
vi.setConfig({ testTimeout: 10000 });

