# @wlindabla/http_client

<div align="center">

[![npm version](https://img.shields.io/npm/v/@wlindabla/http_client.svg?style=flat-square)](https://www.npmjs.com/package/@wlindabla/http_client)
[![npm downloads](https://img.shields.io/npm/dm/@wlindabla/http_client.svg?style=flat-square)](https://www.npmjs.com/package/@wlindabla/http_client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**A professional, event-driven HTTP client for Browser & Node.js**  
Built on top of the native Fetch API with lifecycle events, retry logic, timeout handling, and multi-language error translation.

*By [AGBOKOUDJO Franck](https://www.linkedin.com/in/internationales-web-services-120520193/) — INTERNATIONALES WEB APPS & SERVICES*

</div>

---

## Why @wlindabla/http_client?

### Problems with the native Fetch API

The native `fetch()` is a low-level primitive. Using it directly in production applications leads to recurring pain points:

| Problem | Impact |
|---|---|
| No built-in timeout | A request can hang indefinitely — your UI freezes, your users leave |
| No retry mechanism | A single transient network hiccup permanently fails the request |
| No lifecycle hooks | You cannot intercept, enrich, or short-circuit a request without wrapping every call |
| No structured error handling | `fetch()` only rejects on network failure, not on HTTP 4xx/5xx — silent failures |
| No automatic response parsing | You manually call `.json()`, `.text()`, `.blob()` every time |
| No cancellation state | `AbortController` exists but there is no unified cancellation state on the request object |
| No event-based architecture | Impossible to add cross-cutting concerns (auth, logging, metrics) without polluting business logic |

### What this library brings

`@wlindabla/http_client` solves all of the above with a clean, Symfony-inspired architecture:

- **5-phase lifecycle events** — `REQUEST → BEFORE_SEND → RESPONSE → ERROR → TERMINATE`
- **Automatic retry** with configurable count and exponential back-off
- **Configurable timeout** with `AbortController` under the hood
- **Automatic response parsing** based on `Content-Type` or explicit `responseType`
- **Structured error objects** — `BadResponseHttp`, `HttpFetchError` — with full context
- **Multi-language error translation** — English, French, Spanish, German, extensible
- **FetchDelegate pattern** — cleanly separate request lifecycle side-effects from business logic
- **Browser & Node.js compatible** — works everywhere the Fetch API is available
- **Redirect-aware parsing** — detects auth/session redirects before they crash your JSON parsing
---

## Documentation

The documentation is split across several focused files:

| File | Content |
|---|---|
| **[README.md](./README.md)** *(this file)* | Overview, installation, quick start |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Architecture deep-dive, lifecycle diagram, design decisions |
| **[docs/API.md](./docs/API.md)** | Full API reference — all classes, methods, types, interfaces |
| **[docs/EVENTS.md](./docs/EVENTS.md)** | Event system reference — all events with full examples |
| **[docs/EXAMPLES.md](./docs/EXAMPLES.md)** | Integration examples: Vanilla JS, React, Angular, Vue, Node.js, PHP, Python |
| **[docs/ERROR_HANDLING.md](./docs/ERROR_HANDLING.md)** | Error handling guide — BadResponseHttp, HttpFetchError, FetchErrorTranslator |

---

## Installation

```bash
# npm
npm install @wlindabla/http_client

# yarn
yarn add @wlindabla/http_client

# pnpm
pnpm add @wlindabla/http_client
```

### Requirements

- **Node.js** >= 18 (native `fetch` support)
- **Browser**: Any modern browser with Fetch API support (Chrome 42+, Firefox 39+, Safari 10.1+)
- **TypeScript**: >= 5.0 (recommended)

---

## Quick Start

### Simplest usage — `safeFetch`

The `safeFetch` function is the low-level workhorse. Use it when you don't need lifecycle events.

```typescript
import { safeFetch } from '@wlindabla/http_client';

const response = await safeFetch({
  url: 'https://api.example.com/users',
  methodSend: 'GET',
  responseType: 'json',
  timeout: 10000,   // 10 seconds
  retryCount: 3,    // retry up to 3 times
});

if (response.succeeded) {
  console.log(response.data); // parsed JSON
}
**[see the documentation of the function safeFetch](./docs/safeFetch.md)** 
```

### Full power — `FetchRequest` with events

```typescript
import {
  FetchRequest,
  HttpClientEvents,
  FetchBeforeSendEvent,
  FetchResponseEvent,
  TerminateEvent,
  RequestType,
} from '@wlindabla/http_client';
import { EventDispatcher } from '@wlindabla/event_dispatcher';

// 1. Create the event dispatcher
const dispatcher = new EventDispatcher();

// 2. Register listeners
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  // Inject auth token on every request
  event.mergeFetchOptions({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
});

dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  // Log every completed request
  console.info('[HTTP]', event.isSuccessful() ? 'OK' : 'FAILED', event.getRequest().url);
});

// 3. Build and execute the request
const request = new FetchRequest(
  undefined, // uses DefaultFetchDelegate
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'POST',
    data: { name: 'Alice', email: 'alice@example.com' },
    responseType: 'json',
    timeout: 15000,
    retryCount: 3,
  },
  RequestType.MAIN
);

const response = await request.handle();

if (response.succeeded) {
  console.log('Created user:', response.data);
}
```

---

## Core Concepts

### Request Lifecycle

Every request passes through 5 ordered phases. Each phase dispatches an event that listeners can hook into.

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                    FetchRequest.handle()                        │
 └───────────────────────────┬─────────────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │  Phase 1 — REQUEST                  │
          │  Event: FetchRequestEvent           │
          │  • Intercept before send            │
          │  • Can resolve() / reject()         │
          │  • Can set a response directly      │
          └──────────────────┬──────────────────┘
                             │ (if no response set)
          ┌──────────────────▼──────────────────┐
          │  Phase 2 — BEFORE_SEND              │
          │  Event: FetchBeforeSendEvent        │
          │  • Modify headers / URL / options   │
          │  • Inject auth tokens, CSRF         │
          │  • Cannot short-circuit             │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │  Phase 3 — RESPONSE                 │
          │  Event: FetchResponseEvent          │
          │  • Inspect / transform response     │
          │  • Trigger UI updates               │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │  Phase 4 — ERROR (if exception)     │
          │  Event: FetchRequestErrorEvent      │
          │  • Handle or recover from errors    │
          │  • Set fallback response            │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │  Phase 5 — TERMINATE (always)       │
          │  Event: TerminateEvent              │
          │  • Cleanup, logging, metrics        │
          │  • Always runs, success or failure  │
          └─────────────────────────────────────┘
```

### FetchDelegate Pattern

The `FetchDelegate` separates lifecycle side-effects from your business logic. The default `DefaultFetchDelegate` simply logs to console. You implement your own to drive UI state (spinners, toasts, etc.).

```typescript
import { FetchDelegateInterface, FetchResponseInterface } from '@wlindabla/http_client';

class MyAppDelegate implements FetchDelegateInterface {
  prepareRequest(request: FetchRequest): void {
    console.log('[HTTP] Preparing:', request.url);
  }
  requestStarted(_request: FetchRequest): void {
    document.getElementById('spinner')!.style.display = 'block';
  }
  requestFinished(_request: FetchRequest): void {
    document.getElementById('spinner')!.style.display = 'none';
  }
  requestSucceededWithResponse(_req: FetchRequest, res: FetchResponseInterface): void {
    console.log('[HTTP] Success — status:', res.statusCode);
  }
  requestFailedWithResponse(_req: FetchRequest, res: FetchResponseInterface): void {
    console.warn('[HTTP] Failed — status:', res.statusCode);
  }
  requestPreventedHandlingResponse(_req: FetchRequest, _res: FetchResponseInterface): void {}
  requestErrored(_req: FetchRequest, error: Error): void {
    console.error('[HTTP] Error:', error.message);
  }
}
```

---

## Response Object

Every successful call returns a `FetchResponseInterface`. Key properties:

```typescript
response.statusCode      // number — HTTP status code (200, 404, 500…)
response.succeeded       // boolean — true if 2xx
response.clientError     // boolean — true if 4xx
response.serverError     // boolean — true if 5xx
response.redirected      // boolean — true if response was redirected
  ** safeFetch/FetchRequest now raise HttpRedirectResponseError instead of crashing on .json() when a redirect leads to non-JSON content. 
  **
response.failed          // boolean — true if not 2xx, not redirect, not 1xx
response.ok              // boolean — native fetch .ok
response.statusText      // string  — "OK", "Not Found"…
response.data            // T       — parsed body (json, text, blob, etc.)
response.contentType     // string  — Content-Type header value
response.isHTML          // boolean — true if content is HTML
response.headers         // Headers — all response headers
response.header('X-My')  // string | null — get a single header
response.originalResponse // Response — the raw native fetch Response
```

---

## TypeScript Types

```typescript
// HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT' | 'PURGE' | 'QUERY';

// Response parsing modes
type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';

// Request options
interface FetchRequestOptions {
  url: string | URL;
  methodSend?: HttpMethod;
  data?: unknown;
  timeout?: number;        // ms, default 45000
  retryCount?: number;     // default 3
  responseType?: HttpResponseType; // default 'json'
  retryOnStatusCode?: boolean;
  requestType?: RequestType;
  eventTarget?: EventTargetRequest;
  customOptions?: Record<string, any>;
  // + all standard RequestInit properties (headers, credentials, mode…)
}
```

---

## Author

**AGBOKOUDJO Franck**  
Full-Stack Developer — Symfony / PHP8 / React / TypeScript  
📧 internationaleswebservices@gmail.com  
📞 +229 0167 25 18 86  
🔗 [LinkedIn](https://www.linkedin.com/in/internationales-web-services-120520193/)  
🐙 [GitHub](https://github.com/Agbokoudjo)  
🏢 INTERNATIONALES WEB APPS & SERVICES

---

## License

MIT © AGBOKOUDJO Franck