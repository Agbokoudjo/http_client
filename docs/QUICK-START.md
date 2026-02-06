# @wlindabla/http_client

> A powerful, event-driven HTTP client for Node.js and browsers, inspired by Symfony's HttpKernel architecture.

[![npm version](https://badge.fury.io/js/@wlindabla%2Fhttp_client.svg)](https://www.npmjs.com/package/@wlindabla/http_client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## ✨ Features

- 🎯 **Universal**: Works seamlessly in both Node.js and browsers
- 🎭 **Event-Driven**: Powerful event system inspired by Symfony HttpKernel
- 🔌 **Extensible**: Delegate pattern for custom business logic
- 🛡️ **Type-Safe**: Full TypeScript support with strict typing
- 🔄 **Smart Retry**: Built-in retry mechanism with exponential backoff
- ⏱️ **Timeout Control**: Configurable request timeouts with abort support
- 🎪 **Interceptors**: Request/response transformation via events
- 📦 **Zero Dependencies**: No external runtime dependencies
- 🧪 **Well Tested**: Comprehensive test suite for reliability
- 🎨 **Modern API**: Clean, intuitive API following best practices

---

## 📦 Installation

```bash
# Using npm
npm install @wlindabla/http_client

# Using yarn
yarn add @wlindabla/http_client

# Using pnpm
pnpm add @wlindabla/http_client
```

---

## 🚀 Quick Start

### Browser

```typescript
import {
FetchRequest, 
SimpleFetchDelegate
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() or new BrowserEventDispatcher() which your environnement;

// Make a GET request
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'GET',
    responseType: 'json'
  }
);

const response = await request.handle();
console.log(response.data); // { users: [...] }
```

### Node.js

```typescript
import {
FetchRequest, 
SimpleFetchDelegate
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface ,//if your customered Environnement EventDispatcher without 

    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() ;

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/data',
    methodSend: 'POST',
    data: { name: 'John Doe' },
    headers: { 'Content-Type': 'application/json' }
  }
);

const response = await request.handle();
console.log(response.statusCode); // 201
```

---

## 📖 Core Concepts

### 1. The Delegate Pattern

The `FetchDelegateInterface` allows you to inject custom business logic at every stage of the HTTP request lifecycle:

```typescript
interface FetchDelegateInterface {
  // Called before request starts
  prepareRequest(request: Request): void;
  
  // Called when request starts
  requestStarted(request: Request): void;
  
  // Called when request finishes (success or error)
  requestFinished(request: Request): void;
  
  // Called on request error
  requestErrored(request: Request, error: Error): void;
  
  // Called on successful response (2xx)
  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void;
  
  // Called on failed response (4xx, 5xx)
  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void;
  
  // Called when response handling is prevented
  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void;
}
```

### 2. Event-Driven Architecture

The library dispatches events at key points in the request lifecycle, following Symfony's HttpKernel pattern:

```
┌─────────────┐
│   REQUEST   │ ← Intercept before sending
└──────┬──────┘
       │
┌──────▼──────┐
│ BEFORE_SEND │ ← Last chance to modify
└──────┬──────┘
       │
┌──────▼──────┐
│  RESPONSE   │ ← Transform response
└──────┬──────┘
       │
┌──────▼──────┐
│    ERROR    │ ← Handle errors (if any)
└──────┬──────┘
       │
┌──────▼──────┐
│  TERMINATE  │ ← Always called (cleanup)
└─────────────┘
```

**Available Events:**

- `HttpClientEvents.REQUEST` - Before sending the request
- `HttpClientEvents.BEFORE_SEND` - Just before fetch call
- `HttpClientEvents.RESPONSE` - When response is received
- `HttpClientEvents.ERROR` - When an error occurs
- `HttpClientEvents.TERMINATE` - Always called at the end

---

## 🎯 Usage Examples

### Basic HTTP Methods

#### GET Request

```typescript
import {
FetchRequest, 
SimpleFetchDelegate
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() or new BrowserEventDispatcher() which your environnement

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.github.com/users/octocat',
    methodSend: 'GET',
    responseType: 'json'
  }
);

try {
  const response = await request.handle();
  
  if (response.succeeded) {
    console.log('User:', response.data.login);
    console.log('Repos:', response.data.public_repos);
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

#### POST Request with JSON

```typescript
const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'developer'
};

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'POST',
    data: userData,
    headers: {
      'Content-Type': 'application/json'
    },
    responseType: 'json'
  }
);

const response = await request.handle();
console.log('Created user ID:', response.data.id);
```

#### POST Request with FormData

```typescript
const formData = new FormData();
formData.append('username', 'johndoe');
formData.append('avatar', fileInput.files[0]);

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/upload',
    methodSend: 'POST',
    data: formData,
    responseType: 'json'
  }
);

const response = await request.handle();
console.log('Upload successful:', response.data.url);
```

#### PUT Request (Complete Update)

```typescript
const updatedUser = {
  id: 1,
  name: 'John Smith',
  email: 'john.smith@example.com',
  role: 'senior-developer'
};

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users/1',
    methodSend: 'PUT',
    data: updatedUser,
    headers: {
      'Content-Type': 'application/json'
    }
  }
);

const response = await request.handle();
console.log('User updated:', response.data);
```

#### PATCH Request (Partial Update)

```typescript
const partialUpdate = {
  email: 'newemail@example.com'
};

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users/1',
    methodSend: 'PATCH',
    data: partialUpdate,
    headers: {
      'Content-Type': 'application/json'
    }
  }
);

const response = await request.handle();
console.log('Email updated');
```

#### DELETE Request

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users/1',
    methodSend: 'DELETE'
  }
);

const response = await request.handle();
console.log('User deleted');
```

---

## 🔐 Advanced Features

### Authentication with Interceptors

```typescript
import { HttpClientEvents } from '@wlindabla/http_client';

// Add authentication token to all requests
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    event.mergeFetchOptions({
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
});

// Now all requests will include the auth token
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/protected-resource',
    methodSend: 'GET'
  }
);

const response = await request.handle();
```

### Request/Response Transformation

```typescript
import { HttpClientEvents } from '@wlindabla/http_client';

// Transform all responses to a standard format
dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const response = event.getResponse();
  
  const normalizedData = {
    success: response.succeeded,
    timestamp: new Date().toISOString(),
    data: response.data,
    meta: {
      statusCode: response.statusCode,
      contentType: response.contentType
    }
  };
  
  console.log('Normalized response:', normalizedData);
});
```

### Caching Strategy

```typescript
import { HttpClientEvents } from '@wlindabla/http_client';

const cache = new Map();

// Cache GET requests
dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
  const request = event.getRequest();
  
  if (request.method === 'GET') {
    const cacheKey = request.url;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('Returning cached response');
      event.resolve(cached);
    }
  }
});

// Store responses in cache
dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const request = event.getRequest();
  
  if (request.method === 'GET') {
    const cacheKey = request.url;
    cache.set(cacheKey, event.getResponse());
  }
});
```

### Error Recovery

```typescript
import { HttpClientEvents } from '@wlindabla/http_client';

// Recover from errors with fallback data
dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
  const error = event.getError();
  
  if (error.message.includes('timeout')) {
    console.log('Request timed out, using fallback');
    
     const response = event.getResponse();
        // Ajouter des métadonnées
        const transformedData = {
            timestamp: new Date().toISOString(),
            success: response.succeeded,
            statusCode: response.statusCode,
            originalData: response.data
        };
        
        response.setData( {
            timestamp: new Date().toISOString(),
            success: response.succeeded,
            statusCode: response.statusCode,
            originalData: response.data,
            status: 200,
            statusCode: 200,
            statusText: 'OK (Fallback)',
            ok: true,
            headers: new Headers(),
            data: { fallback: true, message: 'Using cached data' },
            succeeded: true,
            failed: false,
            // ... other required properties
        });

        event.setResponse(response)
  }
});
```

### Request Cancellation

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/slow-endpoint',
    methodSend: 'GET',
    timeout: 10000
  }
);

// Cancel after 2 seconds
setTimeout(() => {
  console.log('Cancelling request...');
  request.cancel();
}, 2000);

try {
  const response = await request.handle();
} catch (error) {
  if (request.isCancelled()) {
    console.log('Request was cancelled');
  }
}
```

### Retry with Exponential Backoff

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/unstable-endpoint',
    methodSend: 'GET',
    retryCount: 3, // Retry up to 3 times
    retryOnStatusCode: true, // Retry on 5xx errors
    timeout: 5000
  }
);

// The library will automatically retry with delays: 500ms, 1000ms, 1500ms
const response = await request.handle();
```

### Timeout Configuration

```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/data',
    methodSend: 'GET',
    timeout: 30000, // 30 seconds timeout
    retryCount: 1 // Don't retry timeouts
  }
);

try {
  const response = await request.handle();
} catch (error) {
  if (error.message.includes('timed out')) {
    console.log('Request exceeded 30 seconds');
  }
}
```

---

## 🎨 Custom Delegate Implementation

Create a custom delegate for your specific needs:

```typescript
import { FetchDelegateInterface, FetchResponseInterface } from '@wlindabla/http_client';

class AnalyticsFetchDelegate implements FetchDelegateInterface {
  private requestStartTimes = new Map<Request, number>();
  private analytics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  prepareRequest(request: Request): void {
    this.analytics.totalRequests++;
    console.log(`[Analytics] Request #${this.analytics.totalRequests}`);
  }

  requestStarted(request: Request): void {
    this.requestStartTimes.set(request, Date.now());
  }

  requestFinished(request: Request): void {
    const startTime = this.requestStartTimes.get(request);
    if (startTime) {
      const duration = Date.now() - startTime;
      const currentTotal = this.analytics.averageResponseTime * (this.analytics.totalRequests - 1);
      this.analytics.averageResponseTime = (currentTotal + duration) / this.analytics.totalRequests;
      this.requestStartTimes.delete(request);
    }
  }

  requestErrored(request: Request, error: Error): void {
    this.analytics.failedRequests++;
    console.error('[Analytics] Request failed:', error.message);
  }

  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void {
    this.analytics.successfulRequests++;
    console.log('[Analytics] Request succeeded:', response.statusCode);
  }

  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void {
    this.analytics.failedRequests++;
    console.warn('[Analytics] Response failed:', response.statusCode);
  }

  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void {
    console.log('[Analytics] Response handling prevented');
  }

  getAnalytics() {
    return { ...this.analytics };
  }
}

// Usage
const analyticsDelegate = new AnalyticsFetchDelegate();

const request = new FetchRequest(
  analyticsDelegate,
  dispatcher,
  { url: 'https://api.example.com/data', methodSend: 'GET' }
);

await request.handle();

console.log('Analytics:', analyticsDelegate.getAnalytics());
// {
//   totalRequests: 1,
//   successfulRequests: 1,
//   failedRequests: 0,
//   averageResponseTime: 234
// }
```

---

## 🌐 Environment-Specific Examples

### Browser Example: Form Submission

```typescript
// HTML Form
// <form id="userForm">
//   <input name="name" required />
//   <input name="email" type="email" required />
//   <button type="submit">Submit</button>
// </form>

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher =new BrowserEventDispatcher() which your environnement

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  const request = new FetchRequest(
    delegate,
    dispatcher,
    {
      url: 'https://api.example.com/users',
      methodSend: 'POST',
      data: formData,
      eventTarget: {
        type: EventTargetType.HTML_ELEMENT,
        instance: e.target
      }
    }
  );
  
  try {
    const response = await request.handle();
    alert('User created successfully!');
    e.target.reset();
  } catch (error) {
    alert('Failed to create user');
  }
});
```

### Browser Example: Image Upload with Progress

```typescript
import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new BrowserEventDispatcher() which your environnement

// Track upload progress
dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
  console.log('Upload started...');
  // You could add a progress bar here
});

const fileInput = document.getElementById('imageUpload');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('image', file);
formData.append('title', 'My Image');

const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/images',
    methodSend: 'POST',
    data: formData
  }
);

const response = await request.handle();
console.log('Image URL:', response.data.url);
```

### Node.js Example: Server-to-Server API Call

```typescript
import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher()  which your environnement

// Add server identification header
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  event.mergeFetchOptions({
    headers: {
      'User-Agent': 'MyApp/1.0.0',
      'X-Server-ID': process.env.SERVER_ID
    }
  });
});

async function fetchUserData(userId: string) {
  const request = new FetchRequest(
    delegate,
    dispatcher,
    {
      url: `https://api.example.com/users/${userId}`,
      methodSend: 'GET',
      timeout: 10000,
      retryCount: 3,
      retryOnStatusCode: true
    }
  );
  
  const response = await request.handle();
  return response.data;
}

// Usage in Express route
app.get('/api/users/:id', async (req, res) => {
  try {
    const userData = await fetchUserData(req.params.id);
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
```

### Node.js Example: Batch Processing

```typescript
import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// Create delegate and dispatcher
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() which your environnement

async function processBatch(userIds: string[]) {
  const requests = userIds.map(id => 
    new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `https://api.example.com/users/${id}`,
        methodSend: 'GET',
        retryCount: 2
      }
    )
  );
  
  // Process all requests in parallel
  const responses = await Promise.allSettled(
    requests.map(req => req.handle())
  );
  
  const successful = responses.filter(r => r.status === 'fulfilled');
  const failed = responses.filter(r => r.status === 'rejected');
  
  console.log(`Processed ${successful.length}/${userIds.length} successfully`);
  
  return {
    successful: successful.map(r => r.value.data),
    failed: failed.map(r => r.reason.message)
  };
}

// Process 100 users in parallel
const result = await processBatch(Array.from({ length: 100 }, (_, i) => `user-${i}`));
```

---

## 📊 Response Handling

### Understanding Response Properties

```typescript
const response = await request.handle();

// Status information
console.log(response.status);      // 200
console.log(response.statusCode);  // 200
console.log(response.statusText);  // "OK"
console.log(response.ok);          // true

// Response classification
console.log(response.succeeded);   // true (2xx)
console.log(response.failed);      // false (4xx or 5xx)
console.log(response.clientError); // false (4xx)
console.log(response.serverError); // false (5xx)
console.log(response.redirected);  // false (3xx)
console.log(response.serverInfo);  // false (1xx)

// Content information
console.log(response.contentType); // "application/json"
console.log(response.isHTML);      // false
console.log(response.headers);     // Headers object
console.log(response.header('content-type')); // Get specific header

// Response data
console.log(response.data);        // Parsed response body
```

### Handling Different Response Types

```typescript
// JSON response
const jsonRequest = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/data.json',
    methodSend: 'GET',
    responseType: 'json' // Default
  }
);

const jsonResponse = await jsonRequest.handle();
console.log(jsonResponse.data); // JavaScript object

// Text response
const textRequest = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/data.txt',
    methodSend: 'GET',
    responseType: 'text'
  }
);

const textResponse = await textRequest.handle();
console.log(textResponse.data); // String

// Blob response (for files)
const blobRequest = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/image.png',
    methodSend: 'GET',
    responseType: 'blob'
  }
);

const blobResponse = await blobRequest.handle();
const imageUrl = URL.createObjectURL(blobResponse.data);
```

---

## ⚠️ Error Handling

### Comprehensive Error Handling

```typescript
import { HttpFetchError } from '@wlindabla/http_client';

try {
  const response = await request.handle();
  
  if (response.clientError) {
    // Handle 4xx errors
    if (response.statusCode === 404) {
      console.log('Resource not found');
    } else if (response.statusCode === 401) {
      console.log('Unauthorized - please login');
    }
  } else if (response.serverError) {
    // Handle 5xx errors
    console.log('Server error - please try again later');
  }
  
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.log('URL:', error.url);
    console.log('Attempt:', error.attempt);
    console.log('Status:', error.responseStatus);
    console.log('Body:', error.responseBody);
    console.log('Cause:', error.cause);
  } else if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.log('Unknown error:', error);
  }
}
```

---

## 🔧 API Reference

### FetchRequest

```typescript
class FetchRequest extends Request implements HttpClientInterface {
  constructor(
    delegate: FetchDelegateInterface,
    dispatcher: EventDispatcherInterface,
    input: string | URL,
    options: FetchRequestOptions,
    requestType?: RequestType,
    eventTarget?: EventTargetRequest
  )
  
  async handle(): Promise<FetchResponseInterface>
  cancel(): void
  isCancelled(): boolean
}
```

### FetchRequestOptions

```typescript
interface FetchRequestOptions<T = any> extends RequestInit {
  url: string | URL;
  methodSend?: HttpMethod; // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | etc.
  data?: T;
  timeout?: number; // in milliseconds
  retryCount?: number; // number of retry attempts
  responseType?: HttpResponseType; // 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream'
  retryOnStatusCode?: boolean; // retry on 5xx errors
  requestType?: RequestType; // MAIN or SUB
  eventTarget?: EventTargetRequest;
  customOptions?: Record<string, any>;
}
```

---

## 🧪 Testing

The library is thoroughly tested. To run tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests in UI mode
npm run test:ui
```

---

## 📄 License

MIT © [Franck Agbokoudjo](https://github.com/Agbokoudjo/)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 💬 Support

- 📧 Email: internationaleswebservices@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/wlindabla/http_client/issues)
- 💼 LinkedIn: [INTERNATIONALES WEB APPS & SERVICES](https://www.linkedin.com/in/internationales-web-apps-services-120520193/)

---

## 🙏 Acknowledgments

Inspired by:
- Symfony HttpKernel architecture
- Axios interceptors pattern
- Modern fetch API standards

---

**Built with ❤️ by AGBOKOUDJO Franck - INTERNATIONALES WEB APPS & SERVICES**