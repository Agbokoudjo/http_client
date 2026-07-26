# Error Handling — @wlindabla/http_client

> **[← Back to README](../README.md)**  
> See also: [Architecture](./ARCHITECTURE.md) | [API Reference](./API.md) | [Events](./EVENTS.md) | [Examples](./EXAMPLES.md)

---

## Table of Contents

- [Error types overview](#error-types-overview)
- [HttpFetchError](#httpfetcherror)
- [BadResponseHttp](#badresponsehttp)
- [FetchErrorTranslator](#fetcherrortranslator)
- [Implementing a Cache Adapter](#implementing-a-cache-adapter)
- [Error recovery via events](#error-recovery-via-events)
- [Full error handling flow](#full-error-handling-flow)
- [HttpRedirectResponseError](#httpredirectresponseerror)
---

## Error types overview

| Error class | When thrown | Recovery possible |
|---|---|---|
| `HttpFetchError` | Network failure, timeout, unexpected error after all retries | Via `FetchRequestErrorEvent.setResponse()` |
| `BadResponseHttp` | When `handle()` returns something that is not `FetchResponseInterface` | No — indicates a programming error |
| Native `Error` | Unexpected runtime error | Via `FetchRequestErrorEvent.setError()` |

HTTP 4xx / 5xx responses are **not exceptions** — they are returned as `FetchResponseInterface` objects with `clientError` or `serverError` set to `true`.

HttpRedirectResponseError | Response body/status indicates a redirect (session expired, login page…) instead of the expected structured data | Not retried — surfaced immediately

---

## `HttpFetchError`

Thrown when the request cannot be completed — after all retries are exhausted or a non-recoverable error occurs.

```typescript
import { HttpFetchError, safeFetch } from '@wlindabla/http_client';

try {
  const res = await safeFetch({
    url: 'https://api.example.com/data',
    timeout: 5000,
    retryCount: 3,
  });
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.error('Request failed for URL:', error.url);
    console.error('Message:', error.message);
    console.error('Caused by:', error.cause);
    // error.attempt        — which attempt number failed
    // error.responseStatus — HTTP status if available
    // error.responseBody   — parsed body if available
  }
}
```

### When is it thrown?

- **AbortError** (timeout): after all `retryCount` attempts timed out
- **NetworkError** (`Failed to fetch`): after all `retryCount` attempts failed
- **Unexpected error**: after all `retryCount` attempts raised an unexpected error
- **Cancellation**: immediately when `request.cancel()` is called

---

## `BadResponseHttp`

Thrown when something unexpected comes back from `FetchRequest.handle()` — for example in a subscriber class that expects an `HttpResponse` but receives `null` or an unrelated object.

```typescript
import { BadResponseHttp, HttpResponse } from '@wlindabla/http_client';

try {
  const result = await request.handle();

  if (!(result instanceof HttpResponse)) {
    throw new BadResponseHttp(
      'Expected HttpResponse from FetchRequest.handle()',
      result
    );
  }

  processResponse(result);

} catch (error) {
  if (error instanceof BadResponseHttp) {
    // Structured context
    console.error(error.toString());
    // [BadResponseHttp] Expected HttpResponse...
    //   Received type : object
    //   Received value: null
    //   Status code   : N/A
    //   Thrown at     : 2025-05-10T08:00:00.000Z

    // For structured logging / Sentry
    const ctx = error.toJSON();
    logger.error('bad_response', ctx);
  }
}
```

### `toJSON()` output shape

```typescript
{
  name: "BadResponseHttp",
  message: "Expected HttpResponse from FetchRequest.handle()",
  receivedType: "object",
  receivedValue: "null",
  statusCode: null,
  thrownAt: "2025-05-10T08:00:00.000Z",
  stack: "BadResponseHttp: Expected..."
}
```

---

## HttpRedirectResponseError
Thrown when a request that expected a structured payload (json, formData, …) instead landed on a redirect — either:
 
 - a *raw* 301/302/303/307/308 status (only observable with `redirect: 'manual'`
     on Node.js, or in browsers when the redirect is opaque), or
   - the browser silently followed the redirect (`redirect: 'follow'`, the default)
     and the final response body doesn't match the expected `responseType`.

 The library does **not** assume where the redirect goes — it could be a login
   page (expired session/token), a maintenance page, a consent/paywall screen, an
   A/B-test routing rule, or anything else the server decides. `finalUrl`,
   `location`, and `contentType` expose exactly where you ended up so *you*
  decide what to do with it. `looksLikeAuthRedirect()` is just one convenience
  heuristic for the common "expired session → login page" case — for any other
  destination, inspect `error.finalUrl` / `error.location` yourself.
 
 ### @example
  ```typescript
     try {
    const res = await safeFetch({ url: '/api/me', responseType: 'json' });
  } catch (error) {
    if (error instanceof HttpRedirectResponseError) {
      if (error.looksLikeAuthRedirect()) {
        window.location.href = '/login';
      } else {
        window.location.href=error.targetRedirectUrl
        // any other destination — decide based on what you actually got
        console.warn('Unexpected redirect to', error.finalUrl ?? error.location);
      }
    }
  }
  ```

## `FetchErrorTranslator`

Provides multi-language, user-friendly translations for Fetch API errors.

### Quick setup

```typescript
import { FetchErrorTranslator } from '@wlindabla/http_client';
import { LocalStorageCacheAdapter } from './my-adapters';

const translator = new FetchErrorTranslator({
  defaultLanguage: 'en',
  cacheAdapter: new LocalStorageCacheAdapter(),
  debug: false,
});
```

### Translate errors in a try/catch

```typescript
try {
  const res = await safeFetch({ url: '/api/data', timeout: 5000 });
} catch (error) {
  if (error instanceof Error) {
    // Translate using error name + error object for pattern matching
    const userMessage = translator.trans(error.name, error);
    alert(userMessage);
    // "Request timed out because the server did not respond within the specified time."
  }
}
```

### Translate with a specific language

```typescript
// French
const msg = translator.trans('NetworkError', null, 'fr');
// "Erreur réseau - Connexion impossible"

// Spanish
const msg = translator.trans('AbortError', null, 'es');
// "Tiempo de espera agotado - El servidor no respondió a tiempo"
```

### Add custom translations

```typescript
// German
translator.addTranslations('de', {
  AbortError: 'Zeitüberschreitung — der Server hat nicht rechtzeitig geantwortet.',
  NetworkError: 'Netzwerkfehler — Verbindung nicht möglich.',
  TypeError: 'Netzwerkfehler — Bitte prüfen Sie Ihre Internetverbindung.',
});

// Custom domain-specific errors
translator.addTranslations('en', {
  PaymentGatewayError: 'Payment service unavailable. Please try again later.',
  RateLimitError: 'Too many requests. Please wait before trying again.',
});
```

### Add custom matching patterns

Patterns are used when no exact match is found — the error message is scanned for keywords:

```typescript
const translator = new FetchErrorTranslator({
  cacheAdapter: myAdapter,
  customPatterns: [
    { keywords: ['quota', 'rate limit'], errorKey: 'RateLimitError' },
    { keywords: ['payment', 'billing'],  errorKey: 'PaymentGatewayError' },
  ],
  additionalTranslations: {
    en: {
      RateLimitError: 'Too many requests. Please wait.',
      PaymentGatewayError: 'Payment unavailable.',
    },
  },
});
```

### Singleton pattern

For use across your entire application, use the singleton accessor:

```typescript
// Initialize once (e.g. in bootstrap/main.ts)
const translator = FetchErrorTranslator.getInstance({
  defaultLanguage: 'en',
  cacheAdapter: new LocalStorageCacheAdapter(),
});

// Use anywhere else in your app
const translator = FetchErrorTranslator.getInstance();
translator.trans('AbortError');
```

To reset the singleton (useful in tests):

```typescript
FetchErrorTranslator.resetInstance();
```

---

## Implementing a Cache Adapter

You must provide a cache adapter that implements `FetchCacheTranslationInterface`.

### `localStorage` adapter (Browser)

```typescript
import { FetchCacheTranslationInterface, TranslationMessages } from '@wlindabla/http_client';

export class LocalStorageCacheAdapter implements FetchCacheTranslationInterface {
  async getItem(key: string): Promise<TranslationMessages | null> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, messages: TranslationMessages): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {
      // quota exceeded or private mode — silently fail
    }
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fetch_error_translation_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
```

### In-memory adapter (Node.js / Testing)

```typescript
import { FetchCacheTranslationInterface, TranslationMessages } from '@wlindabla/http_client';

export class InMemoryCacheAdapter implements FetchCacheTranslationInterface {
  private store = new Map<string, TranslationMessages>();

  async getItem(key: string): Promise<TranslationMessages | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, messages: TranslationMessages): Promise<void> {
    this.store.set(key, messages);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
```

### Redis adapter (Node.js / Server-side)

```typescript
import Redis from 'ioredis';
import { FetchCacheTranslationInterface, TranslationMessages } from '@wlindabla/http_client';

export class RedisCacheAdapter implements FetchCacheTranslationInterface {
  constructor(private readonly redis: Redis, private readonly ttl: number = 3600) {}

  async getItem(key: string): Promise<TranslationMessages | null> {
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async setItem(key: string, messages: TranslationMessages): Promise<void> {
    await this.redis.setex(key, this.ttl, JSON.stringify(messages));
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys('fetch_error_translation_*');
    if (keys.length) await this.redis.del(...keys);
  }

  async has(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

---

## Error recovery via events

The most powerful error handling pattern uses the `ERROR` event to recover from failures gracefully.

```typescript
import {
  HttpClientEvents,
  FetchRequestErrorEvent,
  HttpResponse,
} from '@wlindabla/http_client';

// Return a fallback response on network error
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  const error = event.getError();

  if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
    // Return a synthetic offline response instead of throwing
    const syntheticResponse = new Response(
      JSON.stringify({ offline: true, data: [] }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
    const fallback = new HttpResponse(syntheticResponse, { offline: true, data: [] });
    event.setResponse(fallback); // marks as recovered
  }
});

// After recovery, handle() returns fallback instead of throwing
const res = await request.handle();
console.log(res.data); // { offline: true, data: [] }
```

---

## Full error handling flow

```typescript
import {
  FetchRequest,
  HttpClientEvents,
  FetchBeforeSendEvent,
  FetchResponseEvent,
  FetchRequestErrorEvent,
  TerminateEvent,
  HttpFetchError,
  BadResponseHttp,
  HttpResponse,
  FetchErrorTranslator,
} from '@wlindabla/http_client';
import { EventDispatcher } from '@wlindabla/event_dispatcher';
import { LocalStorageCacheAdapter } from './adapters';

// Setup
const dispatcher = new EventDispatcher();
const translator = new FetchErrorTranslator({
  defaultLanguage: 'en',
  cacheAdapter: new LocalStorageCacheAdapter(),
});

// Auth injection
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  event.mergeFetchOptions({ headers: { Authorization: `Bearer ${getToken()}` } });
});

// Error recovery + translation
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  const err = event.getError();
  const userMessage = translator.trans(err.name, err);
  showToast(userMessage, 'error');
});

// Cleanup
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  hideSpinner();
  logRequest(event);
});

// Execute
try {
  showSpinner();

  const request = new FetchRequest(undefined, dispatcher, {
    url: '/api/orders',
    methodSend: 'POST',
    data: { product: 'Widget', qty: 3 },
    responseType: 'json',
    timeout: 10000,
    retryCount: 3,
  });

  const response = await request.handle();

  if (response.succeeded) {
    console.log('Order created:', response.data);
  } else if (response.clientError) {
    console.warn('Validation error:', response.statusCode, response.data);
  } else if (response.serverError) {
    console.error('Server error:', response.statusCode);
  }

} catch (error) {
  if (error instanceof HttpFetchError) {
    console.error('Network or timeout failure:', error.message);
  } else if (error instanceof BadResponseHttp) {
    console.error('Unexpected response type:', error.toJSON());
    else if (error instanceof HttpRedirectResponseError){
       if (error.looksLikeAuthRedirect()) {
        window.location.href = '/login';
      } else {
        window.location.href=error.targetRedirectUrl
        // any other destination — decide based on what you actually got
        console.warn('Unexpected redirect to', error.targetRedirectUrl);
      }
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```
