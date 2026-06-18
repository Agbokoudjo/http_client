# API Reference — @wlindabla/http_client

> **[← Back to README](../README.md)**  
> See also: [Architecture](./ARCHITECTURE.md) | [Events](./EVENTS.md) | [Examples](./EXAMPLES.md) | [Error Handling](./ERROR_HANDLING.md)

---

## Table of Contents

- [safeFetch()](#safefetch)
- [FetchRequest](#fetchrequest)
- [HttpResponse / FetchResponse](#httpresponse--fetchresponse)
- [FetchDelegateInterface](#fetchdelegateinterface)
- [DefaultFetchDelegate](#defaultfetchdelegate)
- [HttpFetchError](#httpfetcherror)
- [BadResponseHttp](#badresponsehttp)
- [FetchErrorTranslator](#fetcherrortranslator)
- [Types & Enums](#types--enums)
- [Utility Functions](#utility-functions)

---

## `safeFetch()`

```typescript
function safeFetch<K extends HttpResponseType = "json">(
  fetchRequestOptions: FetchRequestOptions
): Promise<FetchResponseInterface<ResponseTypeMap[K]>>
```

A standalone async function for making HTTP requests **without lifecycle events**. Suitable for simple use cases or when you need a lightweight call without the full `FetchRequest` machinery.

### Features built-in

- Automatic retry with configurable count and exponential back-off
- Timeout via `AbortController`
- Auto-detection of `FormData` (removes `Content-Type` header)
- Automatic JSON serialization of request body
- Smart error response parsing (`parseHttpErrorResponse`)

### Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `url` | `string \| URL` | **required** | Target endpoint |
| `methodSend` | `HttpMethod` | `"GET"` | HTTP method |
| `data` | `FetchBodyData` | `null` | Request body (auto-serialized to JSON unless FormData) |
| `headers` | `HeadersInit` | See below | Request headers |
| `timeout` | `number` | `45000` | Timeout in milliseconds (0 = no timeout) |
| `retryCount` | `number` | `3` | Max retry attempts |
| `responseType` | `HttpResponseType` | `"json"` | Expected response format |
| `retryOnStatusCode` | `boolean` | `false` | Retry on 5xx status codes |
| `keepalive` | `boolean` | `false` | Enable keepalive (forces retryCount=1, timeout=0) |

**Default headers:**
```
Accept: application/json
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

### Examples

```typescript
import { safeFetch } from '@wlindabla/http_client';

// GET JSON
const res = await safeFetch({ url: '/api/users', responseType: 'json' });
console.log(res.data); // unknown — cast as needed

// POST JSON
const res = await safeFetch({
  url: '/api/users',
  methodSend: 'POST',
  data: { name: 'Alice' },
  responseType: 'json',
});

// Download blob
const res = await safeFetch({
  url: '/api/export',
  methodSend: 'GET',
  responseType: 'blob',
});
const url = URL.createObjectURL(res.data as Blob);

// Upload FormData
const form = new FormData();
form.append('avatar', fileInput.files[0]);
const res = await safeFetch({
  url: '/api/upload',
  methodSend: 'POST',
  data: form,
  // Content-Type is removed automatically for FormData
});

// Stream response
const res = await safeFetch({
  url: '/api/stream',
  responseType: 'stream',
});
const reader = (res.data as ReadableStream).getReader();
```

### Retry behavior

| Scenario | Behavior |
|---|---|
| `AbortError` (timeout) | Retries up to `retryCount`, then throws `HttpFetchError` |
| Network error (`Failed to fetch`) | Retries with 1s × attempt delay, then throws `HttpFetchError` |
| 4xx client error | Never retried — returns error response immediately |
| 5xx server error + `retryOnStatusCode: false` | Returns error response immediately |
| 5xx server error + `retryOnStatusCode: true` | Retries with 500ms × attempt delay |
| Unexpected error | Retries with 500ms × attempt delay |

**[see the documentation of the function safeFetch](./docs/safeFetch.md)** 
---

## `FetchRequest`

```typescript
class FetchRequest implements HttpClientInterface
```

The main HTTP client. Extends the native `Request` class and adds the full 5-phase lifecycle event system.

### Constructor

```typescript
new FetchRequest(
  fetchDelegate?: FetchDelegateInterface,  // default: DefaultFetchDelegate
  eventDispatcher: EventDispatcherInterface,
  fetchRequestOptions: FetchRequestOptions,
  requestType?: RequestType,              // default: RequestType.MAIN
  eventTarget?: EventTargetRequest
)
```

### Methods

#### `handle(): Promise<FetchResponseInterface>`

Executes the HTTP request through the full lifecycle pipeline. Returns the parsed response.

Throws `HttpFetchError` if the request cannot be completed after all retries and no error listener recovers it.

```typescript
const response = await request.handle();
```

#### `cancel(): void`

Aborts the in-flight request and rejects the promise.

```typescript
const request = new FetchRequest(/* … */);
const promise = request.handle();

setTimeout(() => request.cancel(), 3000); // cancel after 3s if still pending

try {
  const response = await promise;
} catch (e) {
  if (e instanceof HttpFetchError) {
    console.log('Cancelled by user');
  }
}
```

#### `isCancelled(): boolean`

Returns `true` if `cancel()` was called.

#### Getters & Setters

```typescript
request.FetchRequestOptions           // get current options
request.fetchRequestOptions = opts    // replace options
request.data = newData                // replace request body
```

---

## `HttpResponse` / `FetchResponse`

`HttpResponse<T>` is the concrete class returned by all successful calls. It implements `FetchResponseInterface<T>`.

### Properties

```typescript
response.statusCode      // number  — e.g. 200, 404
response.status          // number  — alias for statusCode
response.statusText      // string  — e.g. "OK", "Not Found"
response.ok              // boolean — true if 200–299
response.succeeded       // boolean — true if 200–299
response.serverInfo      // boolean — true if 100–199
response.clientError     // boolean — true if 400–499
response.serverError     // boolean — true if 500–599
response.redirected      // boolean — true if response was redirected
response.failed          // boolean — true if not 2xx, not 1xx, not redirect
response.data            // T       — parsed response body
response.contentType     // string  — Content-Type header
response.isHTML          // boolean — true if content is HTML
response.headers         // Headers — all response headers
response.originalResponse // Response — native fetch Response object
```

### Methods

```typescript
response.header(name: string): string | null  // get a specific header
response.setData(data: T): void               // replace parsed data
response.setOriginalResponse(r: Response): void // replace raw response
```

---

## `FetchDelegateInterface`

```typescript
interface FetchDelegateInterface {
  prepareRequest(request: FetchRequest): void;
  requestStarted(request: FetchRequest): void;
  requestFinished(request: FetchRequest): void;
  requestErrored(request:FetchRequest, error: Error): void;
  requestSucceededWithResponse(request: FetchRequest, fetchResponse: FetchResponseInterface): void;
  requestFailedWithResponse(request: FetchRequest, fetchResponse: FetchResponseInterface): void;
  requestPreventedHandlingResponse(request: FetchRequest, fetchResponse: FetchResponseInterface): void;
}
```

Implement this interface to control UI state, logging, or any other side-effect that should respond to the request lifecycle.

---

## `DefaultFetchDelegate`

The built-in no-op implementation. All methods simply `console.log` their arguments. Replace it with your own implementation in production.

```typescript
import { DefaulFetchDelegate } from '@wlindabla/http_client';

// Used automatically when no delegate is provided:
const request = new FetchRequest(undefined, dispatcher, options);
// equivalent to:
const request = new FetchRequest(new DefaulFetchDelegate(), dispatcher, options);
```

---

## `HttpFetchError`

Thrown by `safeFetch` and `FetchRequest.handle()` when the request cannot be completed.

```typescript
class HttpFetchError extends Error {
  readonly name: string;            // "HttpFetchError"
  readonly url: string | URL | Request;
  readonly attempt?: number;        // which attempt failed
  readonly responseStatus?: number; // HTTP status if available
  readonly responseBody?: any;      // response body if available
  readonly cause?: unknown;         // original error
}
```

```typescript
try {
  await safeFetch({ url: '/api/data', timeout: 5000 });
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.error('URL:', error.url);
    console.error('Cause:', error.cause);
  }
}
```

---

## `BadResponseHttp`

Thrown when a value that is not a valid `FetchResponseInterface` is encountered. Useful when building subscriber classes that rely on `FetchRequest.handle()` returning a proper response object.

```typescript
class BadResponseHttp extends Error {
  readonly name: string;           // "BadResponseHttp"
  readonly receivedType: string;   // typeof receivedValue
  readonly receivedValue: string;  // String(receivedValue)
  readonly statusCode: number | null;
  readonly thrownAt: string;       // ISO-8601 timestamp

  toJSON(): BadResponseHttpContext   // structured log object
  toString(): string                 // human-readable summary
}
```

```typescript
import { BadResponseHttp } from '@wlindabla/http_client';
import { HttpResponse } from '@wlindabla/http_client';

const result = await request.handle();

if (!(result instanceof HttpResponse)) {
  throw new BadResponseHttp(
    'Expected HttpResponse from handle()',
    result
  );
}
```

---

## `FetchErrorTranslator`

Multi-language error translation engine for Fetch API errors.

### Constructor

```typescript
new FetchErrorTranslator(config: FetchErrorTranslatorConfig)
```

```typescript
interface FetchErrorTranslatorConfig {
  defaultLanguage?: string;                        // default: 'en'
  cacheAdapter: FetchCacheTranslationInterface;    // required
  debug?: boolean;                                 // default: false
  customPatterns?: ErrorPattern[];
  additionalTranslations?: ErrorTranslations;
}
```

### Methods

#### `trans(errorName, error?, language?): string`

Translates an error name to a user-friendly message.

```typescript
translator.trans('AbortError');
// "Request timed out because the server did not respond within the specified time."

translator.trans('NetworkError', null, 'fr');
// "Erreur réseau - Connexion impossible"

try {
  await fetch('/api');
} catch (err) {
  const msg = translator.trans(err.name, err);
  alert(msg);
}
```

#### `addTranslations(language, translations): void`

Add or extend translations for a language.

```typescript
translator.addTranslations('de', {
  AbortError: 'Zeitüberschreitung der Anfrage',
  NetworkError: 'Netzwerkfehler',
});
```

#### `getSupportedLanguages(): string[]`

Returns all loaded language codes.

#### `getSupportedErrorNames(language?): string[]`

Returns all translatable error names for a language.

#### `hasTranslationFor(errorName, language?): boolean`

Checks if a translation exists.

#### `exportTranslations(language): TranslationMessages`

Returns the raw translation map for a language (useful for debugging).

#### `getCurrentLanguage(): string`

Returns the active language code.

#### `preload(language): Promise<void>`

Preloads translations from cache for a given language.

#### `clearCache(): Promise<void>`

Clears all cached translations.

#### `configAdapter` (get/set)

Access or replace the cache adapter at runtime.

### Built-in languages & error keys

| Error name | Available in |
|---|---|
| `AbortError` | en, fr, es |
| `TypeError` | en, fr, es |
| `NetworkError` | en, fr, es |
| `SecurityError` | en, fr, es |
| `NotFoundError` | en, fr, es |
| `TimeoutError` | en, fr, es |
| `InvalidStateError` | en, fr, es |
| `SyntaxError` | en, fr, es |
| `ReferenceError` | en, fr, es |
| `RangeError` | en, fr, es |
**[see the documentation of the FetchErrorTranslator](./docs/FetchErrorTranslator.md)** 
---

## Types & Enums

### `HttpMethod`

```typescript
type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT' | 'PURGE' | 'QUERY';
```

### `HttpResponseType`

```typescript
type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';
```

### `ResponseTypeMap`

Maps `HttpResponseType` keys to their TypeScript return types:

```typescript
type ResponseTypeMap = {
  json: unknown;
  text: string;
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  formData: FormData;
  stream: ReadableStream<Uint8Array> | null;
};
```

### `RequestType`

```typescript
enum RequestType {
  MAIN = 1,  // Initial HTTP request (default)
  SUB  = 2,  // Internal sub-request
}
```

### `EventTargetType`

```typescript
enum EventTargetType {
  WINDOW        = 'window',
  DOCUMENT      = 'document',
  EVENT_EMITTER = 'event_emitter',  // Node.js EventEmitter
  HTML_ELEMENT  = 'html_element',
  WORKER        = 'worker',
  UNKNOWN       = 'unknown',
}
```

### `EventTargetRequest`

```typescript
interface EventTargetRequest {
  type: EventTargetType;
  instance: Window | Document | HTMLElement | EventTarget | EventEmitter | null;
}
```

---

## Utility Functions

```typescript
import {
  isClientError,
  isServerError,
  isHTMLResponse,
  mapStatusToResponseType,
  hasProperty,
} from '@wlindabla/http_client';

isClientError(404);          // true  (400–499)
isClientError(200);          // false

isServerError(503);          // true  (500–599)

isHTMLResponse('text/html'); // true

mapStatusToResponseType(200); // 'success'
mapStatusToResponseType(301); // 'redirect'
mapStatusToResponseType(404); // 'error'
mapStatusToResponseType(500); // 'error'
mapStatusToResponseType(100); // 'info'

hasProperty({ a: 1 }, 'a'); // true — safe cross-environment Object.hasOwn
```
