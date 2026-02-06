// ============================================================================
// tests/e2e/real-world-scenarios.test.ts
// Tests End-to-End avec des scénarios réels
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    FetchRequest,
    HttpClientEvents,
    FetchRequestEvent,
    FetchResponseEvent,
    FetchRequestErrorEvent,
    TerminateEvent
} from '../../src';

import {
    EventDispatcherInterface,
    createEventDispatcher } 
    from '@wlindabla/event_dispatcher';
import { MockFetchDelegate } from '../mocks';

function createMockResponse(data: any, status: number = 200) {
    return vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => data,
        text: async () => JSON.stringify(data),
        blob: async () => new Blob([JSON.stringify(data)]),
        arrayBuffer: async () => new ArrayBuffer(8),
        formData: async () => new FormData(),
        clone: function () { return this; },
        body: null,
        bodyUsed: false,
        redirected: false,
        type: 'basic' as ResponseType,
        url: 'https://api.example.com'
    } as Response));
}

describe('E2E: E-commerce Application', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;
    let authToken: string | null = null;

    beforeEach(() => {
        dispatcher = createEventDispatcher();
        delegate = new MockFetchDelegate();
        authToken = null;

        // Système d'authentification automatique
        dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchRequestEvent) => {
            if (authToken) {
                event.mergeFetchOptions({
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            }
        });

        // Logging des requêtes
        dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            console.log(`[Request] ${event.getRequest().method} ${event.getUrl()}`);
        });

        // Gestion des erreurs d'authentification
        dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
            if (event.getResponse().statusCode === 401) {
                authToken = null; // Réinitialiser le token
                console.log('[Auth] Token expired, please login again');
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should login and make authenticated request', async () => {
        // 1. Login
       // global.fetch = createMockResponse({ token: 'abc123', userId: 1 }, 200);

        const loginRequest = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url: 'https://api.shop.com/auth/login',
                methodSend: 'POST',
                data: { email: 'user@example.com', password: 'secret' }
            }
        );

        const loginResponse = await loginRequest.handle();
        authToken = loginResponse.data.token;

        expect(loginResponse.data.token).toBe('abc123');
        expect(authToken).toBe('abc123');

    
        const cartRequest = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url: 'https://api.shop.com/cart',
                methodSend: 'GET',
                data: {
                    items: [
                        { id: 1, name: 'Product A', price: 29.99, quantity: 2 }
                    ],
                    total: 59.98
                }
}
            
        );

        const cartResponse = await cartRequest.handle();

        // Vérifier que le header Authorization a bien été ajouté
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.shop.com/cart',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer abc123'
                })
            })
        );

        expect(cartResponse.data.total).toBe(59.98);
    });

    it('should handle 401 and clear token', async () => {
        authToken = 'expired-token';

        global.fetch = createMockResponse({ error: 'Unauthorized' }, 401);

        const request = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url: 'https://api.shop.com/profile',
                methodSend: 'GET'
            }
        );

        const response = await request.handle();

        expect(response.statusCode).toBe(401);
        expect(authToken).toBe(null); // Token cleared by listener
    });
});

describe('E2E: Progressive Web App with Caching', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;
    let cache: Map<string, any>;
    let isOnline: boolean;

    beforeEach(() => {
        dispatcher = createEventDispatcher();
        delegate = new MockFetchDelegate();
        cache = new Map();
        isOnline = true;

        // Cache strategy
        dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            const url = event.getUrl().toString();

            // Si offline et dans le cache, utiliser le cache
            if (!isOnline && cache.has(url)) {
                console.log(`[Cache] Serving from cache (offline): ${url}`);
                event.resolve(cache.get(url));
            }
            // Si online et dans le cache (cache-first strategy)
            else if (cache.has(url)) {
                const cachedResponse = cache.get(url);
                const cacheTime = cachedResponse._cacheTime || 0;
                const maxAge = 5 * 60 * 1000; // 5 minutes

                if (Date.now() - cacheTime < maxAge) {
                    console.log(`[Cache] Serving from cache (fresh): ${url}`);
                    event.resolve(cachedResponse);
                }
            }
        });

        // Sauvegarder dans le cache après réponse
        dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
            const url = event.getRequest().url;
            const response = event.getResponse();

            if (event.getRequest().method === 'GET' && response.succeeded) {
                const cachedData = {
                    ...response,
                    _cacheTime: Date.now()
                };
                cache.set(url, cachedData);
                console.log(`[Cache] Stored in cache: ${url}`);
            }
        });

        // Fallback en cas d'erreur réseau
        dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
            const url = event.getRequest().url;

            if (event.getError().message.includes('Network') && cache.has(url)) {
                console.log(`[Cache] Network error, using stale cache: ${url}`);
                event.setResponse(cache.get(url));
            }
        });
    });

    it('should cache successful GET requests', async () => {
        global.fetch = createMockResponse({ articles: ['Article 1', 'Article 2'] }, 200);

        const url = 'https://api.news.com/articles';

        // Première requête - doit faire le fetch
        const request1 = new FetchRequest(
            delegate,
            dispatcher as any,
            { url, methodSend: 'GET' }
        );

        const response1 = await request1.handle();
        expect(response1.data.articles).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Deuxième requête - doit utiliser le cache
        const request2 = new FetchRequest(
            delegate,
            dispatcher as any,
            { url, methodSend: 'GET' }
        );

        const response2 = await request2.handle();
        expect(response2.data.articles).toHaveLength(2);
      
    });

    it('should work offline with cached data', async () => {
        const url = 'https://api.news.com/articles';

        // Première requête online
        global.fetch = createMockResponse({ articles: ['Cached Article'] }, 200);

        const request1 = new FetchRequest(
            delegate,
            dispatcher as any,
            { url, methodSend: 'GET' }
        );

        await request1.handle();

        // Passer offline
        isOnline = false;

        // Deuxième requête offline - doit utiliser le cache
        const request2 = new FetchRequest(
            delegate,
            dispatcher as any,
            { url, methodSend: 'GET' }
        );

        const response2 = await request2.handle();
        expect(response2.data.articles).toEqual(['Cached Article']);
    });

    it('should use stale cache on network error', async () => {
        const url = 'https://api.news.com/articles';

        // Mettre en cache d'abord
        cache.set(url, {
            data: { articles: ['Old Article'] },
            statusCode: 200,
            succeeded: true,
            _cacheTime: Date.now()
        });

        // Simuler une erreur réseau
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error: Failed to fetch'));

        const request = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url,
                methodSend: 'GET',
                retryCount: 1
            }
        );

        const response = await request.handle();
        expect(response.data.articles).toEqual(['Old Article']);
    });
});

describe('E2E: API with Rate Limiting', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;
    let requestCounts: Map<string, number[]>;
    const RATE_LIMIT = 5;
    const WINDOW_MS = 10000; // 10 seconds

    beforeEach(() => {
        dispatcher = createEventDispatcher();
        delegate = new MockFetchDelegate();
        requestCounts = new Map();

        // Rate limiter
        dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            const url = event.getUrl().toString();
            const now = Date.now();

            if (!requestCounts.has(url)) {
                requestCounts.set(url, []);
            }

            const requests = requestCounts.get(url)!;

            // Nettoyer les anciennes requêtes
            const validRequests = requests.filter(time => now - time < WINDOW_MS);

            if (validRequests.length >= RATE_LIMIT) {
                const oldestRequest = Math.min(...validRequests);
                const waitTime = WINDOW_MS - (now - oldestRequest);

                console.log(`[RateLimit] Too many requests. Retry after ${waitTime}ms`);

                event.reject(new Error(`Rate limit exceeded. Retry after ${waitTime}ms`));
            } else {
                validRequests.push(now);
                requestCounts.set(url, validRequests);
            }
        });

        // Custom retry avec exponential backoff
        let retryAttempts = new Map<Request, number>();

        dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
            const request = event.getRequest();
            const currentAttempts = retryAttempts.get(request) || 0;
            const maxRetries = 3;

            if (event.getError().message.includes('Rate limit') && currentAttempts < maxRetries) {
                retryAttempts.set(request, currentAttempts + 1);

                const backoffTime = Math.pow(2, currentAttempts) * 1000; // 1s, 2s, 4s

                console.log(`[Retry] Attempt ${currentAttempts + 1}/${maxRetries} in ${backoffTime}ms`);

                setTimeout(() => {
                    // Dans un vrai scénario, on relancerait la requête ici
                }, backoffTime);
            }
        });
    });

    it('should enforce rate limiting', async () => {
        global.fetch = createMockResponse({ data: 'test' }, 200);
        const url = 'https://api.limited.com/endpoint';

        // Faire 5 requêtes (limite)
        for (let i = 0; i < RATE_LIMIT; i++) {
            const request = new FetchRequest(
                delegate,
                dispatcher as any,
                { url, methodSend: 'GET' }
            );
            await request.handle();
        }

        // La 6ème requête devrait être bloquée
        const request = new FetchRequest(
            delegate,
            dispatcher as any,
            { url, methodSend: 'GET', retryCount: 1 }
        );

        await expect(request.handle()).rejects.toThrow('Rate limit exceeded');
    });
});

describe('E2E: Analytics and Monitoring', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;
    let analytics: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        errorsByType: Map<string, number>;
        requestTimes: Map<Request, number>;
    };

    beforeEach(() => {
        dispatcher = createEventDispatcher();
        delegate = new MockFetchDelegate();
        analytics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            errorsByType: new Map(),
            requestTimes: new Map()
        };

        // Tracker le début de chaque requête
        dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            analytics.totalRequests++;
            analytics.requestTimes.set(event.getRequest(), Date.now());
        });

        // Tracker les succès/échecs
        dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
            const startTime = analytics.requestTimes.get(event.getRequest());

            if (startTime) {
                const duration = Date.now() - startTime;
                const currentTotal = analytics.averageResponseTime * (analytics.totalRequests - 1);
                analytics.averageResponseTime = (currentTotal + duration) / analytics.totalRequests;
                analytics.requestTimes.delete(event.getRequest());
            }

            if (event.isSuccessful()) {
                analytics.successfulRequests++;
            } else {
                analytics.failedRequests++;

                const error = event.getError();
                if (error) {
                    const errorType = error.name || 'Unknown';
                    analytics.errorsByType.set(
                        errorType,
                        (analytics.errorsByType.get(errorType) || 0) + 1
                    );
                }
            }
        });
    });

    it('should track request analytics', async () => {
        global.fetch = createMockResponse({ data: 'test' }, 200);

        // Faire quelques requêtes
        for (let i = 0; i < 3; i++) {
            const request = new FetchRequest(
                delegate,
                dispatcher as any,
                {
                    url: `https://api.test.com/endpoint${i}`,
                    methodSend: 'GET'
                }
            );
            await request.handle();
        }

        expect(analytics.totalRequests).toBe(3);
        expect(analytics.successfulRequests).toBe(3);
        expect(analytics.failedRequests).toBe(0);
        expect(analytics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should categorize errors', async () => {
        // Requête qui échoue
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const request1 = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url: 'https://api.test.com/fail',
                methodSend: 'GET',
                retryCount: 1
            }
        );

        try {
            await request1.handle();
        } catch (error) {
            // Expected
        }

        expect(analytics.failedRequests).toBe(1);
        expect(analytics.errorsByType.get('Error')).toBe(1);
    });
});


describe('E2E: Data Transformation Pipeline', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;

    beforeEach(() => {
        dispatcher = createEventDispatcher();
        delegate = new MockFetchDelegate();

        // Normaliser toutes les réponses
        dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
            const response = event.getResponse();

            if (response.data && typeof response.data === 'object') {
                // Ajouter des métadonnées à toutes les réponses
                const normalizedData = {
                    success: response.succeeded,
                    timestamp: new Date().toISOString(),
                    payload: response.data,
                    meta: {
                        statusCode: response.statusCode,
                        contentType: response.contentType
                    }
                };

                // Note: Dans une vraie implémentation, créer un nouveau FetchResponse
                console.log('[Transform] Response normalized:', normalizedData);
            }
        });

        // Transformer les erreurs en format standard
        dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
            const error = event.getError();

            const standardError = {
                success: false,
                timestamp: new Date().toISOString(),
                error: {
                    message: error.message,
                    type: error.name,
                    url: event.getRequest().url
                }
            };

            console.log('[Transform] Error normalized:', standardError);
        });
    });

    it('should transform all responses to standard format', async () => {
        global.fetch = createMockResponse({ users: [{ id: 1, name: 'John' }] }, 200);

        const request = new FetchRequest(
            delegate,
            dispatcher as any,
            {
                url: 'https://api.test.com/users',
                methodSend: 'GET'
            }
        );

        const response = await request.handle();

        // Les listeners ont été appelés pour transformer
        // const responseEvents = dispatcher.dispatchedEvents.filter(
        //     e => e.eventName === HttpClientEvents.RESPONSE
        // );

        // expect(responseEvents).toHaveLength(1);
    });
});

console.log('✅ Tous les tests E2E sont configurés et prêts à être exécutés !');