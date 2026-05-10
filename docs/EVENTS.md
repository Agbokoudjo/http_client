# Events Reference — @wlindabla/http_client

> **[← Back to README](../README.md)**  
> See also: [Architecture](./ARCHITECTURE.md) | [API Reference](./API.md) | [Examples](./EXAMPLES.md)

---

## Table of Contents

- [Overview](#overview)
- [Event Constants — HttpClientEvents](#event-constants--httpclientevents)
- [FetchRequestEvent — Phase 1: REQUEST](#fetchrequestevent--phase-1-request)
- [FetchBeforeSendEvent — Phase 2: BEFORE_SEND](#fetchbeforesendevent--phase-2-before_send)
- [FetchResponseEvent — Phase 3: RESPONSE](#fetchresponseevent--phase-3-response)
- [FetchRequestErrorEvent — Phase 4: ERROR](#fetchrequesterrorevent--phase-4-error)
- [TerminateEvent — Phase 5: TERMINATE](#terminateevent--phase-5-terminate)
- [HttpEvent base class](#httpevent-base-class)
- [Common Patterns](#common-patterns)

---

## Overview

Events are the primary extension point of `@wlindabla/http_client`. Rather than subclassing or wrapping the HTTP client, you register listeners on an `EventDispatcher` and react to each phase of the request lifecycle.

**Registering a listener:**

```typescript
import { EventDispatcher } from '@wlindabla/event_dispatcher';
import { HttpClientEvents, FetchBeforeSendEvent } from '@wlindabla/http_client';

const dispatcher = new EventDispatcher();

dispatcher.addListener(
  HttpClientEvents.BEFORE_SEND,
  (event: FetchBeforeSendEvent) => {
    event.mergeFetchOptions({
      headers: { Authorization: 'Bearer my-token' },
    });
  }
);
```

**Listener priority:** listeners are called in registration order by default. Consult `@wlindabla/event_dispatcher` documentation for priority configuration.

---

## Event Constants — `HttpClientEvents`

```typescript
import { HttpClientEvents } from '@wlindabla/http_client';

HttpClientEvents.REQUEST      // "http_client.request"
HttpClientEvents.BEFORE_SEND  // "http_client.before_send"
HttpClientEvents.RESPONSE     // "http_client.response"
HttpClientEvents.ERROR        // "http_client.error"
HttpClientEvents.TERMINATE    // "http_client.terminate"
```

---

## `FetchRequestEvent` — Phase 1: REQUEST

**Dispatched:** before any fetch call is made, at the very start of `handle()`.  
**Event name:** `HttpClientEvents.REQUEST` → `"http_client.request"`  
**Use cases:** caching, mock responses, authentication gates, feature flags, A/B testing.

### Unique capabilities (not available on other events)

```typescript
event.resolve(value)   // Short-circuit: resolve the promise without fetching
event.reject(reason)   // Short-circuit: reject the promise without fetching
```

Both methods call `stopPropagation()` automatically.

### All available methods

```typescript
// Inherited from HttpEvent
event.getRequest(): Request
event.getRequestType(): RequestType
event.isMainRequest(): boolean
event.isSubRequest(): boolean
event.preventDefault(): void
event.isDefaultPrevented(): boolean
event.stopPropagation(): void

// From RequestEvent
event.getResponse(): ResponseInterface | null
event.setResponse(response: ResponseInterface | null): void  // stops propagation if set
event.hasResponse(): boolean
event.getEventTarget(): EventTargetRequest
event.getCustomOptions(): Record<string, any>
event.getCustomOption<T>(key: string, defaultValue?: T): T | undefined

// Exclusive to FetchRequestEvent
event.getUrl(): string | URL
event.setUrl(url: string | URL): void
event.getFetchOptions(): FetchRequestOptions
event.setFetchOptions(options: FetchRequestOptions): void
event.resolve(value: unknown): void   // ← short-circuit the fetch
event.reject(reason?: any): void      // ← short-circuit with rejection
```

### Examples

```typescript
// Cache hit — serve from cache without fetching
dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
  const cached = myCache.get(event.getUrl().toString());
  if (cached) {
    event.resolve(cached); // resolves the handle() promise immediately
  }
});

// Auth gate — reject before fetching if not authenticated
dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
  if (!authService.isAuthenticated()) {
    event.reject(new Error('User is not authenticated'));
  }
});

// Mock in tests
dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
  if (process.env.NODE_ENV === 'test') {
    event.setResponse(new MockHttpResponse({ id: 1, name: 'Alice' }));
  }
});

// Rewrite URL based on environment
dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
  const url = event.getUrl().toString().replace('https://prod.api.com', 'https://dev.api.com');
  event.setUrl(url);
});
```

---

## `FetchBeforeSendEvent` — Phase 2: BEFORE_SEND

**Dispatched:** just before the actual `fetch()` call is made, after Phase 1.  
**Event name:** `HttpClientEvents.BEFORE_SEND` → `"http_client.before_send"`  
**Use cases:** injecting auth headers, CSRF tokens, request signing, encoding transformations.

> **Important:** This event intentionally does NOT expose `resolve()` or `reject()`.  
> Its sole purpose is technical modification of fetch options. If you need to short-circuit the request, use Phase 1 (`FetchRequestEvent`) instead.

### All available methods

```typescript
// Inherited from HttpEvent / RequestEvent (same as above)
event.getRequest(): Request
event.getRequestType(): RequestType
event.isMainRequest(): boolean
event.preventDefault(): void
event.getResponse(): ResponseInterface | null
event.setResponse(response): void
event.hasResponse(): boolean
event.getEventTarget(): EventTargetRequest
event.getCustomOptions(): Record<string, any>

// Specific to FetchBeforeSendEvent
event.getUrl(): string | URL
event.setUrl(url: string | URL): void
event.getFetchOptions(): FetchRequestOptions
event.setFetchOptions(options: FetchRequestOptions): void

// PRIMARY method for this phase:
event.mergeFetchOptions(options: Partial<FetchRequestOptions>): void
```

### `mergeFetchOptions` — deep merge

`mergeFetchOptions` merges additional options into the existing ones, with **deep merge on `headers`**. This means you never accidentally wipe out previously set headers.

```typescript
// Before: headers = { 'Content-Type': 'application/json' }
event.mergeFetchOptions({ headers: { Authorization: 'Bearer xyz' } });
// After:  headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer xyz' }
```

### Examples

```typescript
// Inject Bearer token
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
  }
});

// Add CSRF token (for non-GET requests)
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const method = event.getFetchOptions().methodSend ?? 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    if (csrf) {
      event.mergeFetchOptions({ headers: { 'X-CSRF-TOKEN': csrf } });
    }
  }
});

// Add API key
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  event.mergeFetchOptions({ headers: { 'X-API-Key': process.env.API_KEY! } });
});

// Environment-based URL rewriting
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  if (process.env.USE_MOCK === 'true') {
    const mockUrl = event.getUrl().toString().replace('/api/', '/mock-api/');
    event.setUrl(mockUrl);
  }
});

// Add request fingerprinting
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  event.mergeFetchOptions({
    headers: {
      'X-Request-ID': crypto.randomUUID(),
      'X-Client-Version': '2.0.0',
    },
  });
});
```

---

## `FetchResponseEvent` — Phase 3: RESPONSE

**Dispatched:** after the response body is parsed and before it is returned to the caller.  
**Event name:** `HttpClientEvents.RESPONSE` → `"http_client.response"`  
**Use cases:** response transformation, caching parsed responses, triggering UI updates, token refresh.

### All available methods

```typescript
// Inherited from HttpEvent
event.getRequest(): Request
event.getRequestType(): RequestType
event.isMainRequest(): boolean
event.preventDefault(): void        // suppresses delegate callbacks
event.isDefaultPrevented(): boolean

// Specific to FetchResponseEvent
event.getResponse(): FetchResponseInterface
event.setResponse(response: FetchResponseInterface): void
event.getEventTarget(): EventTargetRequest | undefined
event.getCustomOptions(): Record<string, any> | undefined
event.getCustomOption<T>(key: string, defaultValue?: T): T | undefined
```

### Delegate interaction

After this event dispatches, the `FetchDelegate` is called:
- `event.preventDefault()` → calls `requestPreventedHandlingResponse()`
- No `preventDefault()` + `response.succeeded` → calls `requestSucceededWithResponse()`
- No `preventDefault()` + `response.failed/clientError/serverError` → calls `requestFailedWithResponse()`

### Examples

```typescript
// Transform response data
dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
  const response = event.getResponse();
  if (response.succeeded && response.contentType.includes('application/json')) {
    const normalized = normalize(response.data); // e.g. camelCase keys
    response.setData(normalized);
    event.setResponse(response);
  }
});

// Cache successful responses
dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
  const res = event.getResponse();
  if (res.succeeded) {
    myCache.set(event.getRequest().url, res);
  }
});

// Auto-refresh JWT on 401
dispatcher.addListener(HttpClientEvents.RESPONSE, async (event: FetchResponseEvent) => {
  if (event.getResponse().statusCode === 401) {
    const newToken = await authService.refreshToken();
    tokenStore.set(newToken);
    // The caller will receive the 401 response — handle retry in your logic
  }
});

// Update global loading state
dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
  store.dispatch(setLoading(false));
  if (event.getResponse().clientError || event.getResponse().serverError) {
    store.dispatch(setError(event.getResponse().statusCode));
  }
});
```

---

## `FetchRequestErrorEvent` — Phase 4: ERROR

**Dispatched:** when an exception is thrown during request execution (network error, timeout, unexpected error).  
**Event name:** `HttpClientEvents.ERROR` → `"http_client.error"`  
**Use cases:** error recovery, fallback responses, error reporting, structured logging.

### All available methods

```typescript
// Inherited from HttpEvent / RequestEvent
event.getRequest(): Request
event.getRequestType(): RequestType
event.preventDefault(): void
event.getEventTarget(): EventTargetRequest
event.getCustomOptions(): Record<string, any>

// From ResponseEventInterface
event.getResponse(): ResponseInterface | null
event.hasResponse(): boolean

// Exclusive to FetchRequestErrorEvent
event.getError(): Error
event.setError(error: Error): void
event.setResponse(response: ResponseInterface | null): void  // marks as recovered
event.isRecovered(): boolean
```

### Recovery mechanism

If a listener calls `event.setResponse(fallback)` with a non-null value, the event is marked as **recovered**. In that case, `handle()` returns the fallback response instead of throwing the error.

### Examples

```typescript
// Provide fallback data on network failure
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  if (event.getError().name === 'AbortError') {
    const fallback = new HttpResponse(new Response('', { status: 408 }), null);
    event.setResponse(fallback);
  }
});

// Report errors to monitoring
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  Sentry.captureException(event.getError(), {
    extra: { url: event.getRequest().url },
  });
});

// Replace generic error with domain-specific one
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  const err = event.getError();
  if (err.message.includes('Failed to fetch')) {
    event.setError(new Error('Could not connect to server. Check your internet connection.'));
  }
});

// Translate error for display
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  const err = event.getError();
  const translated = translator.trans(err.name, err, 'fr');
  notificationService.error(translated);
});
```

---

## `TerminateEvent` — Phase 5: TERMINATE

**Dispatched:** always, whether the request succeeded or failed. Runs in the `finally` block.  
**Event name:** `HttpClientEvents.TERMINATE` → `"http_client.terminate"`  
**Use cases:** cleanup, analytics, performance metrics, logging, releasing resources.

> This event is **read-only** — you cannot modify the response at this point as it has already been returned to the caller.

### All available methods

```typescript
// Inherited from HttpEvent
event.getRequest(): Request
event.getRequestType(): RequestType
event.isMainRequest(): boolean

// Specific to TerminateEvent
event.getResponse(): ResponseInterface | null  // null if error occurred
event.getError(): Error | null                 // null if succeeded
event.isSuccessful(): boolean                  // true if no error and response present
event.getEventTarget(): EventTargetRequest | undefined
event.getCustomOptions(): Record<string, any> | undefined
```

### Examples

```typescript
// Performance metrics
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  const duration = performance.now() - startTime;
  analytics.track('http_request', {
    url: event.getRequest().url,
    status: event.getResponse()?.statusCode,
    success: event.isSuccessful(),
    duration,
  });
});

// Structured request logging
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  const level = event.isSuccessful() ? 'info' : 'error';
  logger[level]('[HTTP]', {
    method: event.getRequest().method,
    url: event.getRequest().url,
    status: event.getResponse()?.statusCode ?? 'N/A',
    error: event.getError()?.message ?? null,
  });
});

// Hide global loading indicator
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  loadingBar.done();
});

// Cleanup resources
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  tempFileManager.cleanup(event.getRequest().url);
});
```

---

## `HttpEvent` base class

All events extend `HttpEvent`, which provides:

```typescript
abstract class HttpEvent extends BaseEvent {
  getRequest(): Request
  getRequestType(): RequestType          // RequestType.MAIN or RequestType.SUB
  isMainRequest(): boolean
  isSubRequest(): boolean
  preventDefault(): void                 // prevent default delegate behavior
  isDefaultPrevented(): boolean
  stopPropagation(): void                // stop subsequent listeners
  // + isPropagationStopped(): boolean  (from BaseEvent)
}
```

---

## Common Patterns

### Composing multiple listeners

```typescript
// auth.listeners.ts
export function registerAuthListeners(dispatcher: EventDispatcher, tokenStore: TokenStore) {
  dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
    const token = tokenStore.get();
    if (token) event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
  });
}

// logging.listeners.ts
export function registerLoggingListeners(dispatcher: EventDispatcher, logger: Logger) {
  dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
    logger.log({ url: event.getRequest().url, ok: event.isSuccessful() });
  });
}

// main.ts
registerAuthListeners(dispatcher, tokenStore);
registerLoggingListeners(dispatcher, logger);
```

### Passing context with `customOptions`

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: '/api/users',
    methodSend: 'GET',
    customOptions: { context: 'user-profile-page', skipCache: false },
  }
);

dispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
  const skip = event.getCustomOption<boolean>('skipCache', false);
  if (!skip) {
    const cached = cache.get(event.getUrl().toString());
    if (cached) event.resolve(cached);
  }
});
```

### EventTarget in Node.js with EventEmitter

```typescript
import { EventEmitter } from 'node:events';
import { EventTargetType } from '@wlindabla/http_client';

const emitter = new EventEmitter();

const request = new FetchRequest(
  delegate,
  dispatcher,
  { url: 'https://api.example.com/data' },
  RequestType.MAIN,
  {
    type: EventTargetType.EVENT_EMITTER,
    instance: emitter,
  }
);
```
