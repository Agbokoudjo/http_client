# API Reference

Complete API documentation for `@wlindabla/http_client`.

---

## Table of Contents

1. [Core Classes](#core-classes)
2. [Interfaces](#interfaces)
3. [Types](#types)
4. [Events](#events)
5. [Utilities](#utilities)

---

## Core Classes

### FetchRequest

The main class for making HTTP requests.

#### Constructor

```typescript
constructor(
  delegate: FetchDelegateInterface,
  dispatcher: EventDispatcherInterface,
  input: string | URL,
  options: FetchRequestOptions,
  requestType?: RequestType,
  eventTarget?: EventTargetRequest
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `delegate` | `FetchDelegateInterface` | Delegate for business logic callbacks |
| `dispatcher` | `EventDispatcherInterface` | Event dispatcher instance |
| `options` | `FetchRequestOptions` | Request configuration options |
| `requestType` | `RequestType` | Optional. MAIN or SUB request type |
| `eventTarget` | `EventTargetRequest` | Optional. Event target information |

**Example:**

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'GET',
    responseType: 'json'
  }
);
```

#### Methods

##### `handle(): Promise<FetchResponseInterface>`

Executes the HTTP request and returns a promise that resolves to the response.

**Returns:** `Promise<FetchResponseInterface>` - The HTTP response

**Throws:** `HttpFetchError` - If the request fails

**Example:**

```typescript
try {
  const response = await request.handle();
  console.log(response.data);
} catch (error) {
  console.error('Request failed:', error);
}
```

##### `cancel(): void`

Cancels the ongoing request.

**Example:**

```typescript
const request = new FetchRequest(/* ... */);

setTimeout(() => {
  request.cancel();
}, 1000);

try {
  await request.handle();
} catch (error) {
  if (request.isCancelled()) {
    console.log('Request was cancelled');
  }
}
```

##### `isCancelled(): boolean`

Checks if the request has been cancelled.

**Returns:** `boolean` - True if cancelled, false otherwise

---

### FetchResponse

Represents an HTTP response with additional metadata.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T` | Parsed response body |
| `status` | `number` | HTTP status code |
| `statusCode` | `number` | HTTP status code (alias) |
| `statusText` | `string` | HTTP status text |
| `ok` | `boolean` | True if status is 2xx |
| `headers` | `Headers` | Response headers |
| `contentType` | `string` | Content-Type header value |
| `isHTML` | `boolean` | True if content is HTML |
| `succeeded` | `boolean` | True if status is 2xx |
| `failed` | `boolean` | True if status is 4xx or 5xx |
| `clientError` | `boolean` | True if status is 4xx |
| `serverError` | `boolean` | True if status is 5xx |
| `redirected` | `boolean` | True if status is 3xx |
| `serverInfo` | `boolean` | True if status is 1xx |

#### Methods

##### `header(name: string): string | null`

Gets a specific response header.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Header name |

**Returns:** `string | null` - Header value or null if not found

**Example:**

```typescript
const response = await request.handle();
const contentType = response.header('content-type');
console.log(contentType); // "application/json"
```

---

### HttpFetchError

Custom error class for HTTP request failures.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string \| URL \| Request` | Request URL |
| `attempt` | `number \| undefined` | Retry attempt number |
| `responseStatus` | `number \| undefined` | HTTP status code if available |
| `responseBody` | `any \| undefined` | Response body if available |
| `cause` | `any \| undefined` | Original error cause |
| `message` | `string` | Error message |
| `name` | `string` | Error name ("HttpFetchError") |

**Example:**

```typescript
try {
  await request.handle();
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.log('Failed URL:', error.url);
    console.log('After attempts:', error.attempt);
    console.log('Status:', error.responseStatus);
    console.log('Response:', error.responseBody);
  }
}
```

---

## Interfaces

### FetchDelegateInterface

Interface for implementing custom business logic at each stage of the request lifecycle.

```typescript
interface FetchDelegateInterface {
  prepareRequest(request: Request): void;
  requestStarted(request: Request): void;
  requestFinished(request: Request): void;
  requestErrored(request: Request, error: Error): void;
  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void;
  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void;
  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void;
}
```

#### Methods

##### `prepareRequest(request: Request): void`

Called before the request starts. Use this to prepare or validate the request.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `Request` | The request object |

**Example:**

```typescript
class MyDelegate implements FetchDelegateInterface {
  prepareRequest(request: Request): void {
    console.log('Preparing request to:', request.url);
    // Add validation, logging, etc.
  }
  // ... other methods
}
```

##### `requestStarted(request: Request): void`

Called when the request starts executing.

##### `requestFinished(request: Request): void`

Called when the request finishes (success or error).

##### `requestErrored(request: Request, error: Error): void`

Called when an error occurs during the request.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `Request` | The request object |
| `error` | `Error` | The error that occurred |

##### `requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void`

Called when the response indicates success (2xx status code).

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `Request` | The request object |
| `response` | `FetchResponseInterface` | The successful response |

##### `requestFailedWithResponse(request: Request, response: FetchResponseInterface): void`

Called when the response indicates failure (4xx or 5xx status code).

##### `requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void`

Called when response handling is prevented (via `preventDefault()`).

---

### EventDispatcherInterface

Interface for event dispatching system.
recommanded using javasccript Library `@wlindabla/event_dispatcher`
doing 

```typescript 
import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";
```

```typescript
export interface EventDispatcherInterface {
    /**
     * Dispatches an event to all registered listeners.
     *
     * @template T - The event type
     * @param event - The event to pass to the event handlers/listeners
     * @param eventName - The name of the event to dispatch. If not supplied,
     *                    the class name of the event should be used instead.
     * @returns The passed event MUST be returned
     * 
     * @example
     * ```typescript
     * const event = new UserCreatedEvent(userId);
     * dispatcher.dispatch(event, 'user.created');
     * ```
     */
    dispatch<T extends object>(event: T, eventName?: string | null): T;

    /**
     * Adds an event listener that listens on the specified event.
     *
     * @param eventName - The event to listen on
     * @param listener - The listener callback
     * @param priority - The higher this value, the earlier an event listener
     *                   will be triggered in the chain (defaults to 0)
     * 
     * @example
     * ```typescript
     * dispatcher.addListener('user.created', (event) => {
     *   console.log('User created:', event.userId);
     * }, 10);
     * ```
     */
    addListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>,
        priority?: number
    ): void;

    /**
     * Adds an event subscriber.
     *
     * The subscriber is asked for all the events it is interested in
     * and added as a listener for these events.
     * 
     * @example
     * ```typescript
     * dispatcher.addSubscriber(new UserSubscriber());
     * ```
     */
    addSubscriber(subscriber: EventSubscriberInterface): void;

    /**
     * Removes an event listener from the specified event.
     *
     * @param eventName - The event name
     * @param listener - The listener to remove
     */
    removeListener<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): void;

    /**
     * Removes an event subscriber.
     */
    removeSubscriber(subscriber: EventSubscriberInterface): void;

    /**
     * Gets the listeners of a specific event or all listeners sorted by descending priority.
     *
     * @param eventName - The name of the event, or null to get all listeners
     * @returns Array of listeners for the event, or a Map of all listeners
     */
    getListeners(eventName?: string | null): EventListener[] | Map<string, EventListener[]>;

    /**
     * Gets the listener priority for a specific event.
     *
     * Returns null if the event or the listener does not exist.
     *
     * @param eventName - The event name
     * @param listener - The listener
     * @returns The priority or null if not found
     */
    getListenerPriority<T extends object = any>(
        eventName: string,
        listener: EventListener<T>
    ): number | null;

    /**
     * Checks whether an event has any registered listeners.
     *
     * @param eventName - The event name, or null to check if any event has listeners
     * @returns True if the specified event has any listeners, false otherwise
     */
    hasListeners(eventName?: string | null): boolean;
}
```

#### Methods

##### `dispatch<T>(event: T, eventName?: string): T`

Dispatches an event to all registered listeners.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `T` | The event object |
| `eventName` | `string` | Optional event name |

**Returns:** `T` - The event object (possibly modified by listeners)

##### `addListener(eventName: string, listener: Function, priority?: number): void`

Adds an event listener.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `eventName` | `string` | - | Event name |
| `listener` | `Function` | - | Listener function |
| `priority` | `number` | `0` | Optional priority (higher = earlier) |

##### `removeListener(eventName: string, listener: Function): void`

Removes an event listener.

##### `hasListeners(eventName?: string): boolean`

Checks if listeners are registered.

---

### FetchResponseInterface

Interface for HTTP response objects.

```typescript
interface FetchResponseInterface<T = any> extends ResponseInterface {
  readonly isHTML: boolean;
  readonly contentType: string;
  readonly data: T;
  header(name: string): string | null;
}
```

---

### ResponseInterface

Base interface for response status information.

```typescript
interface ResponseInterface extends MapStatusToResponseTypeInterface {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
}
```

---

## Types

### FetchRequestOptions

Configuration options for HTTP requests.

```typescript
interface FetchRequestOptions<T = any> extends RequestInit {
  url: string | URL;
  methodSend?: HttpMethod;
  data?: T;
  timeout?: number;
  retryCount?: number;
  responseType?: HttpResponseType;
  retryOnStatusCode?: boolean;
  requestType?: RequestType;
  eventTarget?: EventTargetRequest;
  customOptions?: Record<string, any>;
}
```

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `string \| URL \| Request` | **Required** | Request URL |
| `methodSend` | `HttpMethod` | `'GET'` | HTTP method |
| `data` | `T` | `null` | Request body data |
| `timeout` | `number` | `45000` | Timeout in milliseconds |
| `retryCount` | `number` | `3` | Number of retry attempts |
| `responseType` | `HttpResponseType` | `'json'` | Expected response type |
| `retryOnStatusCode` | `boolean` | `false` | Retry on 5xx errors |
| `requestType` | `RequestType` | `RequestType.MAIN` | Request type |
| `eventTarget` | `EventTargetRequest` | `undefined` | Event target info |
| `customOptions` | `Record<string, any>` | `{}` | Custom options |

---

### HttpMethod

Allowed HTTP methods.

```typescript
type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'HEAD'
  | 'DELETE'
  | 'PURGE'
  | 'OPTIONS'
  | 'TRACE'
  | 'CONNECT';
```

---

### HttpResponseType

Response body parsing types.

```typescript
type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';
```

#### Type Mapping

| Type | Return Type | Description |
|------|-------------|-------------|
| `'json'` | `unknown` | Parses as JSON |
| `'text'` | `string` | Returns as text |
| `'blob'` | `Blob` | Returns as Blob |
| `'arrayBuffer'` | `ArrayBuffer` | Returns as ArrayBuffer |
| `'formData'` | `FormData` | Returns as FormData |
| `'stream'` | `ReadableStream<Uint8Array> \| null` | Returns as stream |

---

### RequestType

Request classification enum.

```typescript
enum RequestType {
  MAIN = 1,  // Main/initial request
  SUB = 2    // Sub-request (like ESI)
}
```

**Example:**

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'GET'
  },
  RequestType.MAIN  // This is a main request
);
```

---

### EventTargetType

Event target classification enum.

```typescript
enum EventTargetType {
  WINDOW = 'window',
  DOCUMENT = 'document',
  EVENT_EMITTER = 'event_emitter',
  HTML_ELEMENT = 'html_element',
  WORKER = 'worker',
  UNKNOWN = 'unknown'
}
```

---

### EventTargetRequest

Event target information.

```typescript
interface EventTargetRequest {
  type: EventTargetType;
  instance: Window | Document | HTMLElement | EventTarget | null;
}
```

**Example:**

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'GET'
  },
  RequestType.MAIN,
  {
    type: EventTargetType.WINDOW,
    instance: window
  }
);
```

---

## Events

### Event Classes

#### HttpEvent (Base Class)

Base class for all HTTP events.

```typescript
abstract class HttpEvent extends BaseEvent {
  protected constructor(
    request: Request,
    requestType: RequestType = RequestType.MAIN
  )
  
  getRequest(): Request
  getRequestType(): RequestType
  isMainRequest(): boolean
  isSubRequest(): boolean
  preventDefault(): void
  isDefaultPrevented(): boolean
}
```

#### FetchRequestEvent

Dispatched before and during request execution.

```typescript
class FetchRequestEvent extends RequestEvent {
  constructor(
    request: Request,
    url: string | URL,
    fetchOptions: RequestInit,
    resolvePromise: (value: unknown) => void,
    rejectPromise: (reason?: any) => void,
    requestType?: RequestType,
    eventTarget?: EventTargetRequest,
    customOptions?: Record<string, any>
  )
  
  getUrl(): string | URL
  setUrl(url: string | URL): void
  getFetchOptions(): RequestInit
  setFetchOptions(options: RequestInit): void
  mergeFetchOptions(options: Partial<RequestInit>): void
  resolve(value: unknown): void
  reject(reason?: any): void
  getEventTarget(): EventTargetRequest | undefined
  getCustomOptions(): Record<string, any> | undefined
}
```

##### Methods

**`getUrl(): string | URL`**

Gets the request URL.

**`setUrl(url: string | URL): void`**

Sets a new request URL.

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
  // Redirect to different environment
  const url = event.getUrl().toString();
  if (process.env.NODE_ENV === 'development') {
    event.setUrl(url.replace('api.example.com', 'dev-api.example.com'));
  }
});
```

**`mergeFetchOptions(options: Partial<RequestInit>): void`**

Merges new options with existing fetch options.

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  event.mergeFetchOptions({
    headers: {
      'X-Custom-Header': 'value'
    }
  });
});
```

**`resolve(value: unknown): void`**

Resolves the request with a value, bypassing the actual fetch call.

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
  const cached = cache.get(event.getUrl());
  if (cached) {
    event.resolve(cached); // Return cached response
  }
});
```

#### FetchResponseEvent

Dispatched when a response is received.

```typescript
class FetchResponseEvent extends HttpEvent {
  constructor(
    request: Request,
    fetchResponse: FetchResponseInterface,
    requestType?: RequestType,
    eventTarget?: EventTargetRequest,
    customOptions?: Record<string, any>
  )
  
  getResponse(): FetchResponseInterface
  setResponse(response: FetchResponseInterface): void
  getEventTarget(): EventTargetRequest | undefined
}
```

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const response = event.getResponse();
  console.log('Received response:', response.statusCode);
  
  // Transform response
  // event.setResponse(transformedResponse);
});
```

#### FetchRequestErrorEvent

Dispatched when an error occurs.

```typescript
class FetchRequestErrorEvent extends RequestEvent {
  constructor(
    request: Request,
    error: Error,
    requestType?: RequestType,
    eventTarget?: EventTargetRequest,
    customOptions?: Record<string, any>
  )
  
  getError(): Error
  setError(error: Error): void
  setResponse(response: ResponseInterface | null): void
  isRecovered(): boolean
}
```

##### Methods

**`isRecovered(): boolean`**

Checks if the error was recovered by setting a response.

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
  const error = event.getError();
  
  if (error.message.includes('timeout')) {
    // Recover with fallback response
    event.setResponse(fallbackResponse);
  }
  
  if (event.isRecovered()) {
    console.log('Error was recovered');
  }
});
```

#### TerminateEvent

Always dispatched at the end of request processing.

```typescript
class TerminateEvent extends HttpEvent {
  constructor(
    request: Request,
    response: ResponseInterface | null,
    error: Error | null = null,
    requestType?: RequestType,
    eventTarget?: EventTargetRequest
  )
  
  getResponse(): ResponseInterface | null
  getError(): Error | null
  isSuccessful(): boolean
}
```

**Example:**

```typescript
dispatcher.addListener(HttpClientEvents.TERMINATE, (event) => {
  if (event.isSuccessful()) {
    console.log('Request completed successfully');
  } else {
    console.log('Request failed:', event.getError());
  }
  
  // Cleanup, logging, metrics, etc.
});
```

---

### HttpClientEvents

Event name constants.

```typescript
class HttpClientEvents {
  static readonly REQUEST = "http_client.request";
  static readonly BEFORE_SEND = "http_client.before_send";
  static readonly RESPONSE = "http_client.response";
  static readonly ERROR = "http_client.error";
  static readonly TERMINATE = "http_client.terminate";
}
```

#### Event Flow

```
1. REQUEST      → Before sending request (can intercept)
2. BEFORE_SEND  → Just before fetch (last chance to modify)
3. [Fetch happens]
4. RESPONSE     → Response received (can transform)
5. ERROR        → Only if error occurs (can recover)
6. TERMINATE    → Always called (cleanup)
```

---

## Utilities

### mapStatusToResponseType

Maps HTTP status codes to response categories.

```typescript
function mapStatusToResponseType(statusCode: number): MappedHttpStatus
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `statusCode` | `number` | HTTP status code |

**Returns:** `'success' | 'info' | 'redirect' | 'error'`

**Example:**

```typescript
mapStatusToResponseType(200); // 'success'
mapStatusToResponseType(404); // 'error'
mapStatusToResponseType(301); // 'redirect'
```

---

### isClientError

Checks if status code is a client error (4xx).

```typescript
function isClientError(statusCode: number): boolean
```

**Example:**

```typescript
isClientError(404); // true
isClientError(500); // false
```

---

### isServerError

Checks if status code is a server error (5xx).

```typescript
function isServerError(statusCode: number): boolean
```

**Example:**

```typescript
isServerError(500); // true
isServerError(404); // false
```

---

### safeFetch

Low-level fetch function with retry logic.

```typescript
async function safeFetch<K extends HttpResponseType = "json">(
  options: FetchRequestOptions
): Promise<FetchResponseInterface<ResponseTypeMap[K]>>
```

**Note:** Generally, you should use `FetchRequest` instead of calling `safeFetch` directly.

---

## Complete Example

Putting it all together:

```typescript
import {
  FetchRequest,
  FetchDelegateInterface,
  FetchResponseInterface,
  HttpClientEvents,
  RequestType,
  EventTargetType
} from '@wlindabla/http_client';

// 1. Implement custom delegate
class MyDelegate implements FetchDelegateInterface {
  prepareRequest(request: Request): void {
    console.log('Preparing:', request.url);
  }
  
  requestStarted(request: Request): void {
    console.log('Started:', request.url);
  }
  
  requestFinished(request: Request): void {
    console.log('Finished:', request.url);
  }
  
  requestErrored(request: Request, error: Error): void {
    console.error('Error:', error.message);
  }
  
  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void {
    console.log('Success:', response.statusCode);
  }
  
  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void {
    console.warn('Failed:', response.statusCode);
  }
  
  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void {
    console.log('Prevented');
  }
}

// 2. Create instances
const delegate = new MyDelegate();
const dispatcher = new SimpleEventDispatcher();

// 3. Add event listeners
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  event.mergeFetchOptions({
    headers: {
      'Authorization': 'Bearer token-123'
    }
  });
});

// 4. Create and execute request
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'GET',
    responseType: 'json',
    timeout: 10000,
    retryCount: 3
  },
  RequestType.MAIN,
  {
    type: EventTargetType.WINDOW,
    instance: typeof window !== 'undefined' ? window : null
  }
);

// 5. Handle response
try {
  const response = await request.handle();
  console.log('Users:', response.data);
} catch (error) {
  console.error('Request failed:', error);
}
```

---

**For more examples, see the [main README](./README.md).**