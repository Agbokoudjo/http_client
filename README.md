# @wlindabla/http_client

<div align="center">

**Enterprise-Grade HTTP Client for Node.js and Browsers**

[Features](#-key-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-real-world-examples) • [Contributing](#-contributing)

---

</div>

## 🎯 Why @wlindabla/http_client?

Traditional HTTP clients are simple wrappers around fetch or XMLHttpRequest. **@wlindabla/http_client** goes beyond that by providing a **Symfony-inspired event-driven architecture** that gives you unprecedented control over every stage of the HTTP request lifecycle.

### The Problem with Traditional HTTP Clients

```typescript
// Traditional approach - limited control
const response = await fetch('/api/users');
const data = await response.json();

// What if you need to:
// ❌ Add authentication to ALL requests?
// ❌ Implement caching strategy?
// ❌ Transform responses globally?
// ❌ Handle errors consistently?
// ❌ Add request/response logging?
// ❌ Implement retry logic with backoff?
```

### The @wlindabla/http_client Solution

```typescript
// Event-driven approach - full control
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  event.mergeFetchOptions({ 
    headers: { 'Authorization': `Bearer ${token}` } 
  });
});

dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  cache.set(event.getRequest().url, event.getResponse());
});

const response = await request.handle();
// ✅ All requests authenticated automatically
// ✅ All responses cached automatically
// ✅ Centralized error handling
// ✅ Full request/response lifecycle control
```

---

## ✨ Key Features

<table>
<tr>
<td>

### 🌍 Universal
Works seamlessly in **Node.js** (18+) and **all modern browsers**. One codebase, everywhere.

</td>
<td>

### 🎭 Event-Driven
**5 lifecycle events** give you control at every stage: REQUEST, BEFORE_SEND, RESPONSE, ERROR, TERMINATE.

</td>
</tr>
<tr>
<td>

### 🔌 Extensible
**Delegate pattern** lets you inject custom logic without modifying core code.

</td>
<td>

### 🛡️ Type-Safe
**Full TypeScript** support with strict typing and intelligent autocomplete.

</td>
</tr>
<tr>
<td>

### 🔄 Smart Retry
Built-in **exponential backoff** retry mechanism with configurable attempts.

</td>
<td>

### ⏱️ Timeout Control
Configurable **request timeouts** with automatic cleanup and abort support.

</td>
</tr>
<tr>
<td>

### 🎪 Interceptors
**Transform requests and responses** globally via event listeners.

</td>
<td>

### 📦 Zero Dependencies
No external runtime dependencies. **Lightweight** and **tree-shakeable**.

</td>
</tr>
</table>

---

## 📦 Installation

```bash
# Using npm
npm install @wlindabla/http_client

# Using Yarn
yarn add @wlindabla/http_client

# Using pnpm
pnpm add @wlindabla/http_client
```

### Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0 (optional)
- **Browsers**: All modern browsers with native Fetch API support

---

## 🚀 Quick Start

### Browser (5 minutes)

Create a simple HTTP client for your web app:

```typescript
import { 
  FetchRequest, 
  HttpClientEvents 
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// 1. Setup (do this once)
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() or new BrowserEventDispatcher() which your environnement;

// 2. Add authentication to all requests
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    event.mergeFetchOptions({
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
});

// 3. Make requests
async function fetchUsers() {
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
  return response.data; // Typed and parsed automatically
}

// 4. Use it
const users = await fetchUsers();
console.log(users); // Array of users
```

### Node.js (5 minutes)

Create an API client for your Node.js backend:

```typescript
import { 
  FetchRequest, 
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// 1. Setup (do this once)
const delegate = new SimpleFetchDelegate();
const dispatcher = new NodeEventDispatcher() ;

// 2. Create a reusable API client
class APIClient {
  constructor(
    private baseURL: string,
    private apiKey: string
  ) {
    // Add API key to all requests
    dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      event.mergeFetchOptions({
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'MyApp/1.0.0'
        }
      });
    });
  }

  async get(endpoint: string) {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      `${this.baseURL}${endpoint}`,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'GET',
        timeout: 10000,
        retryCount: 3
      }
    );

    return await request.handle();
  }

  async post(endpoint: string, data: any) {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'POST',
        data,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return await request.handle();
  }
}

// 3. Use it
const api = new APIClient('https://api.example.com', 'your-api-key');
const users = await api.get('/users');
const newUser = await api.post('/users', { name: 'John Doe' });
```

---

## 🌐 Real-World Examples

### Example 1: E-Commerce Website (Browser)

**Scenario**: Building a shopping cart with authentication and caching.

```typescript
import { 
  FetchRequest, 
  HttpClientEvents,
  EventTargetType 
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface
    BrowserEventDispatcher //for Navigator Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

// 1. Setup (do this once)
const delegate = new SimpleFetchDelegate();
const dispatcher = new BrowserEventDispatcher() which your environnement;

const cache = new Map<string, any>();

// 1. Authentication Interceptor
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    event.mergeFetchOptions({
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
});

// 2. Caching Strategy for GET requests
dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
  const request = event.getRequest();
  
  if (request.method === 'GET') {
    const cached = cache.get(request.url);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log('🎯 Cache hit:', request.url);
      event.resolve(cached.data);
    }
  }
});

dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
  const request = event.getRequest();
  
  if (request.method === 'GET') {
    cache.set(request.url, {
      data: event.getResponse(),
      timestamp: Date.now()
    });
  }
});

// 3. Global Error Handling
dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
  const error = event.getError();
  
  // Show user-friendly error messages
  if (error.message.includes('timeout')) {
    showNotification('Request timed out. Please try again.', 'error');
  } else if (error.message.includes('Network')) {
    showNotification('Network error. Check your connection.', 'error');
  }
  
  // Send to error tracking service
  trackError(error);
});

// 4. Shopping Cart API
class ShoppingCartAPI {
  private baseURL = 'https://api.myshop.com';

  async getCart(): Promise<Cart> {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `${this.baseURL}/cart`,
        methodSend: 'GET',
        responseType: 'json',
        eventTarget: {
          type: EventTargetType.WINDOW,
          instance: window
        }
      }
    );

    const response = await request.handle();
    return response.data as Cart;
  }

  async addToCart(productId: string, quantity: number): Promise<Cart> {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `${this.baseURL}/cart/items`,
        methodSend: 'POST',
        data: { productId, quantity },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const response = await request.handle();
    
    // Invalidate cart cache
    cache.delete(`${this.baseURL}/cart`);
    
    return response.data as Cart;
  }

  async updateQuantity(itemId: string, quantity: number): Promise<Cart> {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `${this.baseURL}/cart/items/${itemId}`,
        methodSend: 'PATCH',
        data: { quantity },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const response = await request.handle();
    cache.delete(`${this.baseURL}/cart`);
    return response.data as Cart;
  }

  async checkout(): Promise<Order> {
    const request = new FetchRequest(
      delegate,
      dispatcher,
      {
        url: `${this.baseURL}/checkout`,
        methodSend: 'POST',
        timeout: 30000, // 30 seconds for payment processing
        retryCount: 1 // Don't retry checkout
      }
    );

    const response = await request.handle();
    
    // Clear cart cache after successful checkout
    cache.delete(`${this.baseURL}/cart`);
    
    return response.data as Order;
  }
}

// 5. Usage in React Component
function ShoppingCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const cartAPI = new ShoppingCartAPI();

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoading(true);
    try {
      const cartData = await cartAPI.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(productId: string) {
    try {
      const updatedCart = await cartAPI.addToCart(productId, 1);
      setCart(updatedCart);
      showNotification('Item added to cart!', 'success');
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }

  async function handleCheckout() {
    try {
      setLoading(true);
      const order = await cartAPI.checkout();
      showNotification(`Order #${order.id} placed successfully!`, 'success');
      setCart(null);
      // Redirect to order confirmation
      window.location.href = `/orders/${order.id}`;
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shopping-cart">
      {loading && <Spinner />}
      {cart && (
        <>
          <CartItems items={cart.items} onUpdateQuantity={updateQuantity} />
          <CartTotal total={cart.total} />
          <button onClick={handleCheckout}>Checkout</button>
        </>
      )}
    </div>
  );
}

// Helper types
interface Cart {
  items: CartItem[];
  total: number;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
}
```

---

### Example 2: Microservices Backend (Node.js)

**Scenario**: Building a backend service that communicates with multiple microservices.

```typescript
import { 
  FetchRequest, 
  FetchDelegateInterface,
  FetchResponseInterface,
  HttpClientEvents 
} from '@wlindabla/http_client';

import {
    EventDispatcherInterface //if your customered Environnement EventDispatcher without forgetted implementer  EventDispatcherInterface,
    NodeEventDispatcher //for NodeJs Environnement ou Customer your  EventDispatcher without forgetted implementer  EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

import express from 'express';

// 1. Custom Delegate for Logging and Monitoring
class MonitoringDelegate implements FetchDelegateInterface {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };
  private requestStartTimes = new Map<Request, number>();

  prepareRequest(request: Request): void {
    this.metrics.totalRequests++;
    console.log(`[${new Date().toISOString()}] 🔧 Preparing: ${request.method} ${request.url}`);
  }

  requestStarted(request: Request): void {
    this.requestStartTimes.set(request, Date.now());
    console.log(`[${new Date().toISOString()}] ▶️  Started: ${request.url}`);
  }

  requestFinished(request: Request): void {
    const startTime = this.requestStartTimes.get(request);
    if (startTime) {
      const duration = Date.now() - startTime;
      const currentTotal = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
      this.metrics.averageResponseTime = (currentTotal + duration) / this.metrics.totalRequests;
      
      console.log(`[${new Date().toISOString()}] ⏹️  Finished: ${request.url} (${duration}ms)`);
      this.requestStartTimes.delete(request);
    }
  }

  requestErrored(request: Request, error: Error): void {
    this.metrics.failedRequests++;
    console.error(`[${new Date().toISOString()}] ❌ Error: ${request.url}`, error.message);
    
    // Send to monitoring service (e.g., Sentry, DataDog)
    this.sendToMonitoring({
      type: 'error',
      url: request.url,
      error: error.message,
      timestamp: Date.now()
    });
  }

  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void {
    this.metrics.successfulRequests++;
    console.log(`[${new Date().toISOString()}] ✅ Success: ${request.url} (${response.statusCode})`);
  }

  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void {
    this.metrics.failedRequests++;
    console.warn(`[${new Date().toISOString()}] ⚠️  Failed: ${request.url} (${response.statusCode})`);
  }

  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void {
    console.log(`[${new Date().toISOString()}] 🛑 Prevented: ${request.url}`);
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
    };
  }

  private sendToMonitoring(data: any) {
    // Implementation for your monitoring service
    console.log('📊 Monitoring:', data);
  }
}

// 2. Service Discovery and Load Balancing
class ServiceRegistry {
  private services = new Map<string, string[]>();

  constructor() {
    // Register service instances
    this.register('users-service', [
      'http://users-service-1:3001',
      'http://users-service-2:3001',
      'http://users-service-3:3001'
    ]);
    
    this.register('orders-service', [
      'http://orders-service-1:3002',
      'http://orders-service-2:3002'
    ]);
    
    this.register('payments-service', [
      'http://payments-service-1:3003'
    ]);
  }

  register(serviceName: string, instances: string[]) {
    this.services.set(serviceName, instances);
  }

  getInstance(serviceName: string): string {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    // Round-robin load balancing
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }
}

// 3. Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.warn(`⚠️  Circuit breaker OPEN. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState() {
    return this.state;
  }
}

// 4. API Gateway Service
class APIGateway {
  private delegate = new MonitoringDelegate();
  private dispatcher = new SimpleEventDispatcher();
  private serviceRegistry = new ServiceRegistry();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Add service authentication
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      event.mergeFetchOptions({
        headers: {
          'X-Service-Token': process.env.SERVICE_TOKEN || 'internal-service-token',
          'X-Request-ID': this.generateRequestId(),
          'X-Correlation-ID': this.getCorrelationId()
        }
      });
    });

    // Add retry logic for transient failures
    this.dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
      const error = event.getError();
      
      if (this.isTransientError(error)) {
        console.log('🔄 Transient error detected, will retry...');
      }
    });
  }

  private getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCorrelationId(): string {
    // In a real app, this would come from the request context
    return `corr_${Date.now()}`;
  }

  private isTransientError(error: Error): boolean {
    return error.message.includes('timeout') || 
           error.message.includes('Network') ||
           error.message.includes('ECONNRESET');
  }

  async callService(
    serviceName: string, 
    endpoint: string, 
    options: any = {}
  ): Promise<any> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);
    const baseURL = this.serviceRegistry.getInstance(serviceName);

    return circuitBreaker.execute(async () => {
      const request = new FetchRequest(
        this.delegate,
        this.dispatcher,
        {
          url: `${baseURL}${endpoint}`,
          methodSend: options.method || 'GET',
          data: options.data,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          timeout: 10000,
          retryCount: 3,
          retryOnStatusCode: true
        }
      );

      const response = await request.handle();
      return response.data;
    });
  }

  getMetrics() {
    const circuitBreakerStates: Record<string, string> = {};
    this.circuitBreakers.forEach((cb, service) => {
      circuitBreakerStates[service] = cb.getState();
    });

    return {
      httpClient: this.delegate.getMetrics(),
      circuitBreakers: circuitBreakerStates
    };
  }
}

// 5. Express API Routes
const app = express();
const gateway = new APIGateway();

app.use(express.json());

// Get user profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await gateway.callService('users-service', `/users/${req.params.id}`);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    // 1. Validate user
    const user = await gateway.callService('users-service', `/users/${req.body.userId}`);
    
    // 2. Create order
    const order = await gateway.callService('orders-service', '/orders', {
      method: 'POST',
      data: {
        userId: user.id,
        items: req.body.items,
        total: req.body.total
      }
    });

    // 3. Process payment
    const payment = await gateway.callService('payments-service', '/payments', {
      method: 'POST',
      data: {
        orderId: order.id,
        amount: order.total,
        method: req.body.paymentMethod
      }
    });

    res.json({
      order,
      payment,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Health check and metrics
app.get('/health', (req, res) => {
  const metrics = gateway.getMetrics();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
```

---

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICK-START.md)** - Get started in 5 minutes
- **[API Reference](./docs/API-REFERENCE.md)** - Complete API documentation
- **[Advanced Guide](./docs/ADVANCED-GUIDE.md)** - Patterns and best practices
- **[Migration Guide](./docs/MIGRATION.md)** - Migrate from Axios or Fetch
- **[TypeScript Guide](./docs/TYPESCRIPT.md)** - Type-safe usage
- **[safeFetch](./docs/safeFetch.md)** - The `safeFetch` is a robust, production-ready HTTP client utility designed specifically for modern frontend applications
- **[FetchErrorTranslator](./docs/FetchErrorTranslator)** - Enterprise-grade translation system for Fetch API errors with intelligent pattern matching, multi-language support, and configurable caching. Convert cryptic error messages into user-friendly, localized text.
---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

---

## 📄 License

MIT © [AGBOKOUDJO Franck](https://github.com/Agbokoudjo) - INTERNATIONALES WEB APPS & SERVICES

---

## 🙏 Acknowledgments

- Inspired by Symfony HttpKernel architecture
- Built with ❤️ by the open-source community

---

<div align="center">

**[⬆ back to top](#wlindablahttp_client)**

Made with ❤️ in Benin 🇧🇯

</div> 
