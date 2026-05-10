# Architecture — @wlindabla/http_client

> **[← Back to README](../README.md)**  
> See also: [API Reference](./API.md) | [Events](./EVENTS.md) | [Examples](./EXAMPLES.md) | [Error Handling](./ERROR_HANDLING.md)

---

## Table of Contents

- [Architecture — @wlindabla/http\_client](#architecture--wlindablahttp_client)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Design Philosophy](#design-philosophy)
  - [Request Lifecycle (5 Phases)](#request-lifecycle-5-phases)
  - [Event Architecture](#event-architecture)
    - [Event class hierarchy](#event-class-hierarchy)
    - [Event name constants](#event-name-constants)
    - [Stopping propagation](#stopping-propagation)
  - [FetchDelegate Pattern](#fetchdelegate-pattern)
  - [Response Pipeline](#response-pipeline)
  - [Cache Adapter System](#cache-adapter-system)
  - [Browser vs Node.js Compatibility](#browser-vs-nodejs-compatibility)

---

## Project Structure

```
src/
├── cache/
│   └── index.ts              # FetchCacheTranslationInterface, ConfigCacheAdapterTranslation
├── contracts/
│   └── index.ts              # Core interfaces: FetchResponseInterface, FetchDelegateInterface…
├── core/
│   ├── DefaultFetchDelegate.ts  # Default no-op delegate implementation
│   ├── FetchErrorTranslator.ts  # Multi-language error translation system
│   ├── FetchRequest.ts          # Main HTTP client — FetchRequest class + safeFetch()
│   ├── FetchResponse.ts         # Response classes — HttpResponse, responseTypeHandle()
│   └── index.ts
├── events/
│   └── index.ts              # All event classes + HttpClientEvents constants
├── exceptions/
│   └── index.ts              # BadResponseHttp exception
├── types/
│   └── index.ts              # HttpMethod, HttpResponseType, FetchRequestOptions, enums…
├── utils/
│   └── index.ts              # isClientError, isServerError, mapStatusToResponseType…
└── index.ts                  # Public exports
```

---

## Design Philosophy

This library is inspired by **Symfony's HttpKernel** component. The central ideas:

**1. Events over inheritance**  
Instead of subclassing an HTTP client to extend its behavior, you register event listeners. This keeps your code decoupled and composable.

**2. Separation of concerns via delegates**  
The `FetchDelegate` handles lifecycle side-effects (UI state, logging). The business logic handles data. Neither knows about the other.

**3. Semantic phases**  
Each phase of the request lifecycle has a distinct event class with a distinct API surface, making the intent of each listener immediately clear from its type signature.

**4. Type safety throughout**  
Response types are generic — `FetchResponseInterface<T>` — so your IDE knows the shape of `response.data` at the call site.

**5. No magic, no hidden state**  
Every behavior is opt-in and traceable. The library does not mutate global state.

---

## Request Lifecycle (5 Phases)

```
FetchRequest.handle()
│
├── Phase 1 — REQUEST  ──────────────────────────────── FetchRequestEvent
│   │   Dispatched before anything is sent.
│   │   Listeners CAN:
│   │     • call event.resolve(value) → short-circuit, bypass fetch entirely
│   │     • call event.reject(reason) → reject the promise immediately
│   │     • call event.setResponse(response) → provide a cached/mock response
│   │     • call event.preventDefault() → pause and wait for manual resolution
│   │
│   └── If a response was set → skip Phase 2 and go to Phase 3
│
├── Phase 2 — BEFORE_SEND  ──────────────────────────── FetchBeforeSendEvent
│   │   Last chance to modify the actual fetch call.
│   │   Listeners CAN:
│   │     • call event.mergeFetchOptions({headers: {...}}) → inject auth headers
│   │     • call event.setUrl(newUrl) → rewrite URL (e.g. dev vs prod)
│   │     • call event.setFetchOptions(options) → replace options entirely
│   │   Listeners CANNOT:
│   │     • resolve() or reject() — this phase is modification-only
│   │
│   └── Actual fetch() is called here
│
├── Phase 3 — RESPONSE  ─────────────────────────────── FetchResponseEvent
│   │   Dispatched after the response body is parsed.
│   │   Listeners CAN:
│   │     • call event.setResponse(newResponse) → transform or replace response
│   │     • call event.preventDefault() → suppress delegate callbacks
│   │
│   └── FetchDelegate callbacks are triggered here (succeeded / failed / prevented)
│
├── Phase 4 — ERROR (only if an exception was thrown)  ─ FetchRequestErrorEvent
│   │   Dispatched when any error occurs (timeout, network, unexpected).
│   │   Listeners CAN:
│   │     • call event.setResponse(fallback) → recover: return fallback instead of throwing
│   │     • call event.setError(newError) → replace the error
│   │
│   └── If event.isRecovered() → return fallback response; otherwise rethrow
│
└── Phase 5 — TERMINATE (always, even on error)  ─────── TerminateEvent
        Always fires regardless of success or failure.
        Listeners CAN:
          • inspect event.isSuccessful()
          • inspect event.getResponse() or event.getError()
          • perform cleanup, flush metrics, close resources
        Listeners CANNOT:
          • modify the response (already returned to the caller)
```

---

## Event Architecture

### Event class hierarchy

```
BaseEvent (from @wlindabla/event_dispatcher)
└── HttpEvent
    ├── RequestEvent  (abstract — carries optional response + eventTarget)
    │   ├── FetchRequestEvent      ← Phase 1: REQUEST
    │   ├── FetchBeforeSendEvent   ← Phase 2: BEFORE_SEND
    │   └── FetchRequestErrorEvent ← Phase 4: ERROR
    └── FetchResponseEvent         ← Phase 3: RESPONSE
TerminateEvent extends HttpEvent   ← Phase 5: TERMINATE
```

### Event name constants

```typescript
HttpClientEvents.REQUEST      // "http_client.request"
HttpClientEvents.BEFORE_SEND  // "http_client.before_send"
HttpClientEvents.RESPONSE     // "http_client.response"
HttpClientEvents.ERROR        // "http_client.error"
HttpClientEvents.TERMINATE    // "http_client.terminate"
```

### Stopping propagation

Every event inherits `stopPropagation()` from `BaseEvent`. Once called, subsequent listeners for that event are not executed. `resolve()` and `reject()` on `FetchRequestEvent` call `stopPropagation()` automatically.

---

## FetchDelegate Pattern

The `FetchDelegateInterface` separates UI/side-effect concerns from request logic. It is called at specific points during execution — not via events, but via direct method calls from within `FetchRequest`.

```
FetchRequest.handle()
├── prepareRequest()         ← before any event dispatching
├── requestStarted()         ← after Phase 1 (before fetch or short-circuit)
│
│   [phases 1–3 execute]
│
├── requestSucceededWithResponse()  ← Phase 3, if 2xx and not preventDefault
│   OR requestFailedWithResponse()  ← Phase 3, if not 2xx
│   OR requestPreventedHandlingResponse() ← Phase 3, if preventDefault()
│
├── requestErrored()         ← Phase 4, if error is not recovered
└── requestFinished()        ← always, in finally block
```

You provide a delegate to the `FetchRequest` constructor. The `DefaultFetchDelegate` is used if none is provided.

---

## Response Pipeline

```
fetch(url, options)
        │
        ▼
  Response (native)
        │
   ┌────┴─────────────────────────────────────────────────┐
   │  mapStatusToResponseType(statusCode)                 │
   │  Returns: 'success' | 'info' | 'redirect' | 'error'  │
   └────┬─────────────────────────────────────────────────┘
        │
   ┌────▼────────────────────────────────────────────────────────────┐
   │  if 'success' or 'info':                                        │
   │      responseTypeHandle(responseType, response)                 │
   │      → reads body according to: json/text/blob/arrayBuffer/...  │
   │      → returns HttpResponse<T>                                  │
   ├────────────────────────────────────────────────────────────────-┤
   │  if 'error' (4xx/5xx):                                          │
   │      parseHttpErrorResponse(response)                           │
   │      → auto-detects Content-Type                                │
   │      → parses as JSON, text, or XML                             │
   │      → returns HttpResponse with error body                     │
   └─────────────────────────────────────────────────────────────────┘
```

`parseHttpErrorResponse` handles: `application/json`, `application/ld+json`, `application/problem+json`, `application/vnd.api+json`, HTML, XML, and falls back to `statusText`.

---

## Cache Adapter System

The `FetchErrorTranslator` uses a pluggable cache adapter (`FetchCacheTranslationInterface`) to persist translations across page loads.

```
FetchErrorTranslator
        │
        │ uses
        ▼
FetchCacheTranslationInterface
   ├── getItem(key): Promise<TranslationMessages | null>
   ├── setItem(key, messages): Promise<void>
   ├── clear?(): Promise<void>
   ├── has?(key): Promise<boolean>
   └── delete?(key): Promise<void>
```

You can implement this interface against any storage backend:

- `localStorage` — for simple browser apps
- `IndexedDB / Dexie` — for large-scale browser apps
- Node.js `Map` — for server-side use
- Redis — for distributed environments

---

## Browser vs Node.js Compatibility

| Feature | Browser | Node.js >= 18 |
|---|---|---|
| `safeFetch` | ✅ | ✅ |
| `FetchRequest` | ✅ | ✅ |
| `AbortController` | ✅ | ✅ |
| `FormData` | ✅ | ✅ (via `node-fetch` or native) |
| `Blob` | ✅ | ✅ |
| `ReadableStream` | ✅ | ✅ |
| `EventEmitter` as eventTarget | ❌ | ✅ |
| `Window/Document` as eventTarget | ✅ | ❌ |
| `FetchErrorTranslator` | ✅ | ✅ |

For **Node.js < 18**, install a fetch polyfill such as `node-fetch` or `cross-fetch`.
