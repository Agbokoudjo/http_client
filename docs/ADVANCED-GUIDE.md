# Advanced Guide

Best practices, design patterns, and advanced usage for `@wlindabla/http_client`.

---

## Table of Contents

1. [Architecture Patterns](#architecture-patterns)
2. [Best Practices](#best-practices)
3. [Performance Optimization](#performance-optimization)
4. [Security](#security)
5. [Testing Strategies](#testing-strategies)
6. [Migration Guide](#migration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Patterns

### 1. Repository Pattern

Encapsulate API calls in repository classes:

```typescript
import { FetchRequest, FetchDelegateInterface, EventDispatcherInterface } from '@wlindabla/http_client';

class UserRepository {
  constructor(
    private readonly delegate: FetchDelegateInterface,
    private readonly dispatcher: EventDispatcherInterface,
    private readonly baseURL: string
  ) {}

  async findAll(): Promise<User[]> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      `${this.baseURL}/users`,
      {
        url: `${this.baseURL}/users`,
        methodSend: 'GET',
        responseType: 'json'
      }
    );

    const response = await request.handle();
    return response.data as User[];
  }

  async findById(id: string): Promise<User | null> {
    try {
      const request = new FetchRequest(
        this.delegate,
        this.dispatcher,
        {
          url: `${this.baseURL}/users/${id}`,
          methodSend: 'GET',
          responseType: 'json'
        }
      );

      const response = await request.handle();
      return response.data as User;
    } catch (error) {
      if (error.responseStatus === 404) {
        return null;
      }
      throw error;
    }
  }

  async create(userData: Partial<User>): Promise<User> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}/users`,
        methodSend: 'POST',
        data: userData,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const response = await request.handle();
    return response.data as User;
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}/users/${id}`,
        methodSend: 'PUT',
        data: userData,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const response = await request.handle();
    return response.data as User;
  }

  async delete(id: string): Promise<void> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}/users/${id}`,
        methodSend: 'DELETE'
      }
    );

    await request.handle();
  }
}

// Usage
const userRepo = new UserRepository(delegate, dispatcher, 'https://api.example.com');
const users = await userRepo.findAll();
const user = await userRepo.findById('123');
```

---

### 2. Service Layer Pattern

Create service classes for business logic:

```typescript
class AuthenticationService {
  private token: string | null = null;

  constructor(
    private readonly delegate: FetchDelegateInterface,
    private readonly dispatcher: EventDispatcherInterface,
    private readonly baseURL: string
  ) {
    // Add auth interceptor
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      if (this.token) {
        event.mergeFetchOptions({
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}/auth/login`,
        methodSend: 'POST',
        data: { email, password },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const response = await request.handle();
    this.token = response.data.token;
    
    // Store in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', this.token);
    }
  }

  async logout(): Promise<void> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      `${this.baseURL}/auth/logout`,
      {
        url: `${this.baseURL}/auth/logout`,
        methodSend: 'POST'
      }
    );

    await request.handle();
    this.token = null;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }
}
```

---

### 3. Factory Pattern

Create requests using factory functions:

```typescript
class RequestFactory {
  constructor(
    private readonly delegate: FetchDelegateInterface,
    private readonly dispatcher: EventDispatcherInterface,
    private readonly baseURL: string
  ) {}

  createGetRequest(endpoint: string, options?: Partial<FetchRequestOptions>) {
    return new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'GET',
        responseType: 'json',
        ...options
      }
    );
  }

  createPostRequest(endpoint: string, data: any, options?: Partial<FetchRequestOptions>) {
    return new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'POST',
        data,
        headers: { 'Content-Type': 'application/json' },
        ...options
      }
    );
  }

  createPutRequest(endpoint: string, data: any, options?: Partial<FetchRequestOptions>) {
    return new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'PUT',
        data,
        headers: { 'Content-Type': 'application/json' },
        ...options
      }
    );
  }

  createDeleteRequest(endpoint: string, options?: Partial<FetchRequestOptions>) {
    return new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'DELETE',
        ...options
      }
    );
  }
}

// Usage
const factory = new RequestFactory(delegate, dispatcher, 'https://api.example.com');
const request = factory.createGetRequest('/users');
const response = await request.handle();
```

---

### 4. Singleton Pattern for Global Configuration

```typescript
class HttpClientManager {
  private static instance: HttpClientManager;
  private delegate: FetchDelegateInterface;
  private dispatcher: EventDispatcherInterface;
  private baseURL: string;

  private constructor() {
    this.delegate = new SimpleFetchDelegate();
    this.dispatcher = new SimpleEventDispatcher();
    this.baseURL = 'https://api.example.com';
    
    this.setupInterceptors();
  }

  static getInstance(): HttpClientManager {
    if (!HttpClientManager.instance) {
      HttpClientManager.instance = new HttpClientManager();
    }
    return HttpClientManager.instance;
  }

  private setupInterceptors(): void {
    // Global auth interceptor
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      const token = this.getToken();
      if (token) {
        event.mergeFetchOptions({
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    });

    // Global error handler
    this.dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
      console.error('Global error handler:', event.getError());
    });
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  getDelegate(): FetchDelegateInterface {
    return this.delegate;
  }

  getDispatcher(): EventDispatcherInterface {
    return this.dispatcher;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  private getToken(): string | null {
    return typeof localStorage !== 'undefined' 
      ? localStorage.getItem('auth_token') 
      : null;
  }
}

// Usage
const manager = HttpClientManager.getInstance();
const request = new FetchRequest(
  manager.getDelegate(),
  manager.getDispatcher(),
  `${manager.getBaseURL()}/users`,
  { url: `${manager.getBaseURL()}/users`, methodSend: 'GET' }
);
```

---

## Best Practices

### 1. Error Handling

**Always handle errors gracefully:**

```typescript
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `https://api.example.com/users/${userId}`,
        methodSend: 'GET',
        timeout: 10000,
        retryCount: 3
      }
    );

    const response = await request.handle();

    // Check response status
    if (response.clientError) {
      if (response.statusCode === 404) {
        console.log('User not found');
        return null;
      }
      throw new Error(`Client error: ${response.statusCode}`);
    }

    if (response.serverError) {
      throw new Error('Server error occurred');
    }

    return response.data as User;

  } catch (error) {
    if (error instanceof HttpFetchError) {
      console.error('HTTP Error:', {
        url: error.url,
        status: error.responseStatus,
        attempt: error.attempt
      });
    } else if (error.name === 'AbortError') {
      console.error('Request was cancelled');
    } else {
      console.error('Unexpected error:', error);
    }
    
    // Rethrow or return default value
    throw error;
  }
}
```

---

### 2. Type Safety

**Use TypeScript generics for type-safe responses:**

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function fetchUsers(): Promise<User[]> {
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
  const apiResponse = response.data as ApiResponse<User[]>;
  
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || 'Request failed');
  }

  return apiResponse.data;
}
```

---

### 3. Centralized Configuration

**Create a configuration module:**

```typescript
// config/http-client.config.ts
export const httpClientConfig = {
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: 30000,
  retryCount: 3,
  retryOnStatusCode: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Usage
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: `${httpClientConfig.baseURL}/users`,
    methodSend: 'GET',
    timeout: httpClientConfig.timeout,
    retryCount: httpClientConfig.retryCount,
    headers: httpClientConfig.headers
  }
);
```

---

### 4. Request Cancellation

**Always cancel requests when component unmounts:**

```typescript
// React example
import { useEffect, useRef } from 'react';

function UserList() {
  const requestRef = useRef<FetchRequest | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      requestRef.current = new FetchRequest(
        delegate,
        dispatcher,
        'https://api.example.com/users',
        { url: 'https://api.example.com/users', methodSend: 'GET' }
      );

      try {
        const response = await requestRef.current.handle();
        // Handle response
      } catch (error) {
        if (!requestRef.current.isCancelled()) {
          // Handle error
        }
      }
    };

    fetchUsers();

    // Cleanup: cancel request on unmount
    return () => {
      if (requestRef.current) {
        requestRef.current.cancel();
      }
    };
  }, []);

  return <div>User List</div>;
}
```

---

## Performance Optimization

### 1. Request Batching

**Batch multiple requests:**

```typescript
async function batchFetchUsers(userIds: string[]): Promise<User[]> {
  const requests = userIds.map(id => 
    new FetchRequest(
      delegate,
      dispatcher,
      { url: `https://api.example.com/users/${id}`, methodSend: 'GET' }
    )
  );

  const responses = await Promise.all(
    requests.map(req => req.handle())
  );

  return responses.map(res => res.data as User);
}
```

---

### 2. Caching Strategy

**Implement intelligent caching:**

```typescript
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private dispatcher: EventDispatcherInterface
  ) {
    this.setupCacheInterceptors();
  }

  private setupCacheInterceptors(): void {
    // Check cache before request
    this.dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
      const request = event.getRequest();
      
      if (request.method === 'GET') {
        const cached = this.get(request.url);
        if (cached) {
          console.log('Cache hit:', request.url);
          event.resolve(cached);
        }
      }
    });

    // Store response in cache
    this.dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
      const request = event.getRequest();
      
      if (request.method === 'GET') {
        this.set(request.url, event.getResponse());
      }
    });
  }

  private get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern: string | RegExp): void {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      } else {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }
}

// Usage
const cacheManager = new CacheManager(dispatcher);

// Invalidate cache when data changes
await createUser(userData);
cacheManager.invalidate('/users'); // Clear all user-related cache
```

---

### 3. Request Deduplication

**Prevent duplicate requests:**

```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  constructor(
    private dispatcher: EventDispatcherInterface
  ) {
    this.setupDeduplication();
  }

  private setupDeduplication(): void {
    this.dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
      const request = event.getRequest();
      const key = `${request.method}:${request.url}`;

      // Check if same request is pending
      const pendingRequest = this.pending.get(key);
      if (pendingRequest) {
        console.log('Deduplicating request:', key);
        event.resolve(pendingRequest);
      }
    });

    this.dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
      const request = event.getRequest();
      const key = `${request.method}:${request.url}`;
      this.pending.delete(key);
    });

    this.dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
      const request = event.getRequest();
      const key = `${request.method}:${request.url}`;
      this.pending.delete(key);
    });
  }
}
```

---

## Security

### 1. CSRF Protection

```typescript
class CSRFProtection {
  private csrfToken: string | null = null;

  constructor(
    private dispatcher: EventDispatcherInterface
  ) {
    this.setupCSRFInterceptor();
  }

  async fetchCSRFToken(): Promise<void> {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    this.csrfToken = data.token;
  }

  private setupCSRFInterceptor(): void {
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      const request = event.getRequest();
      
      // Add CSRF token to state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        if (this.csrfToken) {
          event.mergeFetchOptions({
            headers: {
              'X-CSRF-Token': this.csrfToken
            }
          });
        }
      }
    });
  }
}

// Usage
const csrfProtection = new CSRFProtection(dispatcher);
await csrfProtection.fetchCSRFToken();
```

---

### 2. API Key Management

```typescript
class APIKeyManager {
  constructor(
    private dispatcher: EventDispatcherInterface,
    private apiKey: string
  ) {
    this.setupAPIKeyInterceptor();
  }

  private setupAPIKeyInterceptor(): void {
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      event.mergeFetchOptions({
        headers: {
          'X-API-Key': this.apiKey
        }
      });
    });
  }

  rotateKey(newKey: string): void {
    this.apiKey = newKey;
  }
}
```

---

### 3. Content Security

```typescript
// Validate response content type
dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const response = event.getResponse();
  const contentType = response.contentType;

  // Only accept JSON responses
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }
});

// Sanitize response data
dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const response = event.getResponse();
  
  if (response.isHTML) {
    console.warn('Received HTML response - possible XSS attack');
    // Don't render HTML directly
  }
});
```

---

## Testing Strategies

### 1. Mocking Delegates

```typescript
// test/mocks/mock-delegate.ts
class MockFetchDelegate implements FetchDelegateInterface {
  public calls = {
    prepareRequest: [],
    requestStarted: [],
    requestFinished: [],
    requestErrored: [],
    requestSucceeded: [],
    requestFailed: [],
    requestPrevented: []
  };

  prepareRequest(request: Request): void {
    this.calls.prepareRequest.push(request);
  }

  requestStarted(request: Request): void {
    this.calls.requestStarted.push(request);
  }

  requestFinished(request: Request): void {
    this.calls.requestFinished.push(request);
  }

  requestErrored(request: Request, error: Error): void {
    this.calls.requestErrored.push({ request, error });
  }

  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void {
    this.calls.requestSucceeded.push({ request, response });
  }

  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void {
    this.calls.requestFailed.push({ request, response });
  }

  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void {
    this.calls.requestPrevented.push({ request, response });
  }

  reset(): void {
    this.calls = {
      prepareRequest: [],
      requestStarted: [],
      requestFinished: [],
      requestErrored: [],
      requestSucceeded: [],
      requestFailed: [],
      requestPrevented: []
    };
  }
}
```

---

### 2. Testing with Mock Server

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FetchRequest, SimpleFetchDelegate, SimpleEventDispatcher } from '@wlindabla/http_client';

describe('UserRepository', () => {
  let mockServer;

  beforeAll(async () => {
    mockServer = await startMockServer();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('should fetch users', async () => {
    const delegate = new SimpleFetchDelegate();
    const dispatcher = new SimpleEventDispatcher();

    const request = new FetchRequest(
      delegate,
      dispatcher,
      { url: 'http://localhost:3000/users', methodSend: 'GET' }
    );

    const response = await request.handle();

    expect(response.succeeded).toBe(true);
    expect(response.data).toBeInstanceOf(Array);
  });
});
```

---

## Migration Guide

### From Axios

**Axios:**
```typescript
const response = await axios.get('https://api.example.com/users');
console.log(response.data);
```

**@wlindabla/http_client:**
```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  { url: 'https://api.example.com/users', methodSend: 'GET' }
);

const response = await request.handle();
console.log(response.data);
```

---

### From Fetch API

**Fetch:**
```typescript
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' })
});
const data = await response.json();
```

**@wlindabla/http_client:**
```typescript
const request = new FetchRequest(
  delegate,
  dispatcher,
  {
    url: 'https://api.example.com/users',
    methodSend: 'POST',
    data: { name: 'John' },
    headers: { 'Content-Type': 'application/json' }
  }
);

const response = await request.handle();
console.log(response.data); // Already parsed
```

---

## Troubleshooting

### Common Issues

**Issue: Requests timing out**

```typescript
// Increase timeout
const request = new FetchRequest(
  delegate,
  dispatcher,
  url,
  {
    url,
    methodSend: 'GET',
    timeout: 60000 // 60 seconds
  }
);
```

**Issue: CORS errors in browser**

```typescript
// Ensure server supports CORS
// Add credentials if needed
const request = new FetchRequest(
  delegate,
  dispatcher,
  url,
  {
    url,
    methodSend: 'GET',
    credentials: 'include' // Send cookies
  }
);
```

**Issue: Request not cancelled**

```typescript
// Make sure to keep reference
const requestRef = useRef(null);

requestRef.current = new FetchRequest(/*...*/);

// Later
requestRef.current.cancel();
```

---

**For more information, see the [API Reference](./API-REFERENCE.md).**