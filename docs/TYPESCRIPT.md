# 📚 Complete Examples Cookbook

Practical, production-ready examples for `@wlindabla/http_client` in both **Browser** and **Node.js** environments.

---

## Table of Contents

**Browser Examples**
1. [React E-Commerce App](#1-react-e-commerce-app)
2. [Vue.js Dashboard](#2-vuejs-dashboard)
3. [Vanilla JS SPA](#3-vanilla-js-spa)
4. [Progressive Web App with Offline Support](#4-progressive-web-app-with-offline-support)

**Node.js Examples**
5. [Express API Gateway](#5-express-api-gateway)
6. [NestJS Microservice](#6-nestjs-microservice)
7. [CLI Tool](#7-cli-tool)
8. [Serverless Function (AWS Lambda)](#8-serverless-function-aws-lambda)

**Advanced Patterns**
9. [GraphQL Client](#9-graphql-client)
10. [WebSocket Fallback](#10-websocket-fallback)

---

## Browser Examples

### 1. React E-Commerce App

Complete shopping cart implementation with authentication, caching, and optimistic UI updates.

```typescript
// src/services/http-client.service.ts
import { 
  FetchRequest, 
  SimpleFetchDelegate, 
  SimpleEventDispatcher,
  HttpClientEvents,
  EventTargetType 
} from '@wlindabla/http_client';

// Singleton HTTP Client Manager
class HTTPClientService {
  private static instance: HTTPClientService;
  private delegate = new SimpleFetchDelegate();
  private dispatcher = new SimpleEventDispatcher();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.setupInterceptors();
  }

  static getInstance(): HTTPClientService {
    if (!HTTPClientService.instance) {
      HTTPClientService.instance = new HTTPClientService();
    }
    return HTTPClientService.instance;
  }

  private setupInterceptors(): void {
    // Auth interceptor
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        event.mergeFetchOptions({
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    });

    // Cache interceptor (GET only)
    this.dispatcher.addListener(HttpClientEvents.REQUEST, (event) => {
      const request = event.getRequest();
      
      if (request.method === 'GET') {
        const cached = this.cache.get(request.url);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log('💾 Cache hit:', request.url);
          event.resolve(cached.data);
        }
      }
    });

    // Store in cache
    this.dispatcher.addListener(HttpClientEvents.RESPONSE, (event) => {
      const request = event.getRequest();
      
      if (request.method === 'GET') {
        this.cache.set(request.url, {
          data: event.getResponse(),
          timestamp: Date.now()
        });
      }
    });

    // Global error handler
    this.dispatcher.addListener(HttpClientEvents.ERROR, (event) => {
      const error = event.getError();
      
      // Handle 401 Unauthorized
      if (error.responseStatus === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }

      // Show toast notification
      window.dispatchEvent(new CustomEvent('http-error', {
        detail: { message: error.message }
      }));
    });
  }

  async request(url: string, options: any = {}): Promise<any> {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      {
        url,
        methodSend: options.method || 'GET',
        data: options.data,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 30000,
        retryCount: options.retryCount || 3,
        eventTarget: {
          type: EventTargetType.WINDOW,
          instance: window
        }
      }
    );

    const response = await request.handle();
    return response.data;
  }

  invalidateCache(pattern: string | RegExp): void {
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

export const httpClient = HTTPClientService.getInstance();

// src/api/products.api.ts
import { httpClient } from '../services/http-client.service';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.example.com';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
}

export const productsAPI = {
  getAll: async (): Promise<Product[]> => {
    return await httpClient.request(`${API_BASE}/products`);
  },

  getById: async (id: string): Promise<Product> => {
    return await httpClient.request(`${API_BASE}/products/${id}`);
  },

  search: async (query: string): Promise<Product[]> => {
    return await httpClient.request(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`);
  }
};

// src/api/cart.api.ts
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export const cartAPI = {
  get: async (): Promise<Cart> => {
    return await httpClient.request(`${API_BASE}/cart`);
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const cart = await httpClient.request(`${API_BASE}/cart/items`, {
      method: 'POST',
      data: { productId, quantity }
    });
    
    // Invalidate cart cache
    httpClient.invalidateCache('/cart');
    
    return cart;
  },

  updateQuantity: async (productId: string, quantity: number): Promise<Cart> => {
    const cart = await httpClient.request(`${API_BASE}/cart/items/${productId}`, {
      method: 'PATCH',
      data: { quantity }
    });
    
    httpClient.invalidateCache('/cart');
    return cart;
  },

  removeItem: async (productId: string): Promise<Cart> => {
    const cart = await httpClient.request(`${API_BASE}/cart/items/${productId}`, {
      method: 'DELETE'
    });
    
    httpClient.invalidateCache('/cart');
    return cart;
  },

  clear: async (): Promise<void> => {
    await httpClient.request(`${API_BASE}/cart`, {
      method: 'DELETE'
    });
    
    httpClient.invalidateCache('/cart');
  }
};

// src/hooks/useCart.ts
import { useState, useEffect } from 'react';
import { cartAPI, Cart } from '../api/cart.api';

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoading(true);
    setError(null);
    
    try {
      const data = await cartAPI.get();
      setCart(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(productId: string, quantity: number) {
    setLoading(true);
    setError(null);
    
    try {
      const updatedCart = await cartAPI.addItem(productId, quantity);
      setCart(updatedCart);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false); 
    }
  }

  async function updateQuantity(productId: string, quantity: number) {
    // Optimistic UI update
    if (cart) {
      const optimisticCart = {
        ...cart,
        items: cart.items.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      };
      setCart(optimisticCart);
    }

    try {
      const updatedCart = await cartAPI.updateQuantity(productId, quantity);
      setCart(updatedCart);
    } catch (err: any) {
      // Revert on error
      await loadCart();
      setError(err.message);
      throw err;
    }
  }

  async function removeItem(productId: string) {
    // Optimistic UI update
    if (cart) {
      const optimisticCart = {
        ...cart,
        items: cart.items.filter(item => item.productId !== productId)
      };
      setCart(optimisticCart);
    }

    try {
      const updatedCart = await cartAPI.removeItem(productId);
      setCart(updatedCart);
    } catch (err: any) {
      await loadCart();
      setError(err.message);
      throw err;
    }
  }

  return {
    cart,
    loading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    refresh: loadCart
  };
}

// src/components/ShoppingCart.tsx
import React from 'react';
import { useCart } from '../hooks/useCart';

export function ShoppingCart() {
  const { cart, loading, error, updateQuantity, removeItem } = useCart();

  if (loading && !cart) {
    return <div className="spinner">Loading cart...</div>;
  }

  if (error && !cart) {
    return <div className="error">Error: {error}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return <div className="empty-cart">Your cart is empty</div>;
  }

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>
      
      {cart.items.map(item => (
        <div key={item.productId} className="cart-item">
          <div className="item-info">
            <h3>{item.name}</h3>
            <p>${item.price}</p>
          </div>
          
          <div className="item-quantity">
            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
              -
            </button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
              +
            </button>
          </div>
          
          <button 
            className="remove-btn"
            onClick={() => removeItem(item.productId)}
          >
            Remove
          </button>
        </div>
      ))}
      
      <div className="cart-total">
        <h3>Total: ${cart.total.toFixed(2)}</h3>
        <button className="checkout-btn">Proceed to Checkout</button>
      </div>
    </div>
  );
}
```

---

### 2. Vue.js Dashboard

Real-time dashboard with WebSocket fallback and periodic polling.

```typescript
// src/services/api.service.ts
import { 
  FetchRequest, 
  SimpleFetchDelegate, 
  SimpleEventDispatcher,
  HttpClientEvents 
} from '@wlindabla/http_client';

class APIService {
  private delegate = new SimpleFetchDelegate();
  private dispatcher = new SimpleEventDispatcher();
  private baseURL = import.meta.env.VITE_API_URL;

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Add auth token
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      const token = localStorage.getItem('token');
      if (token) {
        event.mergeFetchOptions({
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    });
  }

  async get(endpoint: string, options = {}) {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      `${this.baseURL}${endpoint}`,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'GET',
        ...options
      }
    );

    const response = await request.handle();
    return response.data;
  }

  async post(endpoint: string, data: any, options = {}) {
    const request = new FetchRequest(
      this.delegate,
      this.dispatcher,
      `${this.baseURL}${endpoint}`,
      {
        url: `${this.baseURL}${endpoint}`,
        methodSend: 'POST',
        data,
        headers: { 'Content-Type': 'application/json' },
        ...options
      }
    );

    const response = await request.handle();
    return response.data;
  }
}

export const api = new APIService();

// src/composables/useMetrics.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '../services/api.service';

export function useMetrics() {
  const metrics = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let intervalId: number | null = null;

  async function fetchMetrics() {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.get('/metrics');
      metrics.value = data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  function startPolling(interval = 5000) {
    fetchMetrics(); // Initial fetch
    intervalId = setInterval(fetchMetrics, interval);
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics
  };
}

// src/components/Dashboard.vue
<template>
  <div class="dashboard">
    <div v-if="loading && !metrics" class="loading">
      Loading metrics...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="metrics" class="metrics">
      <div class="metric-card">
        <h3>Total Requests</h3>
        <p class="value">{{ metrics.totalRequests }}</p>
      </div>

      <div class="metric-card">
        <h3>Success Rate</h3>
        <p class="value">{{ metrics.successRate }}%</p>
      </div>

      <div class="metric-card">
        <h3>Avg Response Time</h3>
        <p class="value">{{ metrics.avgResponseTime }}ms</p>
      </div>

      <div class="metric-card">
        <h3>Active Users</h3>
        <p class="value">{{ metrics.activeUsers }}</p>
      </div>
    </div>

    <button @click="refresh" class="refresh-btn">
      Refresh Now
    </button>
  </div>
</template>

<script setup lang="ts">
import { useMetrics } from '../composables/useMetrics';

const { metrics, loading, error, refresh } = useMetrics();
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.value {
  font-size: 2em;
  font-weight: bold;
  color: #667eea;
}
</style>
```

---

## Node.js Examples

### 5. Express API Gateway

Production-ready API gateway with circuit breaker, rate limiting, and monitoring.

```typescript
// src/services/gateway.service.ts
import { 
  FetchRequest, 
  FetchDelegateInterface,
  FetchResponseInterface,
  SimpleEventDispatcher,
  HttpClientEvents 
} from '@wlindabla/http_client';

// Custom delegate with detailed logging
class GatewayDelegate implements FetchDelegateInterface {
  prepareRequest(request: Request): void {
    console.log(`[Gateway] 🔧 Preparing: ${request.method} ${request.url}`);
  }

  requestStarted(request: Request): void {
    console.log(`[Gateway] ▶️  Started: ${request.url}`);
  }

  requestFinished(request: Request): void {
    console.log(`[Gateway] ⏹️  Finished: ${request.url}`);
  }

  requestErrored(request: Request, error: Error): void {
    console.error(`[Gateway] ❌ Error: ${request.url}`, error);
  }

  requestSucceededWithResponse(request: Request, response: FetchResponseInterface): void {
    console.log(`[Gateway] ✅ Success: ${request.url} (${response.statusCode})`);
  }

  requestFailedWithResponse(request: Request, response: FetchResponseInterface): void {
    console.warn(`[Gateway] ⚠️  Failed: ${request.url} (${response.statusCode})`);
  }

  requestPreventedHandlingResponse(request: Request, response: FetchResponseInterface): void {
    console.log(`[Gateway] 🛑 Prevented: ${request.url}`);
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  private failures = 0;
  private readonly threshold: number;
  private readonly timeout: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

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
      console.warn(`Circuit breaker OPEN until ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
    };
  }
}

// Service Registry
class ServiceRegistry {
  private services = new Map<string, string[]>();
  private currentIndex = new Map<string, number>();

  register(name: string, instances: string[]) {
    this.services.set(name, instances);
    this.currentIndex.set(name, 0);
  }

  getInstance(name: string): string {
    const instances = this.services.get(name);
    if (!instances || instances.length === 0) {
      throw new Error(`Service ${name} not found`);
    }

    // Round-robin load balancing
    const currentIdx = this.currentIndex.get(name) || 0;
    const instance = instances[currentIdx];
    
    this.currentIndex.set(name, (currentIdx + 1) % instances.length);
    
    return instance;
  }

  getAll() {
    const result: Record<string, any> = {};
    this.services.forEach((instances, name) => {
      result[name] = {
        instances,
        healthy: instances.length
      };
    });
    return result;
  }
}

// Main Gateway Service
export class GatewayService {
  private delegate = new GatewayDelegate();
  private dispatcher = new SimpleEventDispatcher();
  private registry = new ServiceRegistry();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor() {
    this.setupServices();
    this.setupInterceptors();
  }

  private setupServices() {
    // Register microservices
    this.registry.register('users', [
      process.env.USERS_SERVICE_URL || 'http://localhost:3001'
    ]);
    
    this.registry.register('orders', [
      process.env.ORDERS_SERVICE_URL || 'http://localhost:3002'
    ]);
    
    this.registry.register('payments', [
      process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3003'
    ]);
  }

  private setupInterceptors() {
    // Add service token to all requests
    this.dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
      event.mergeFetchOptions({
        headers: {
          'X-Service-Token': process.env.SERVICE_TOKEN || 'internal-token',
          'X-Gateway-Version': '1.0.0'
        }
      });
    });
  }

  private getCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker());
    }
    return this.circuitBreakers.get(service)!;
  }

  async call(service: string, endpoint: string, options: any = {}) {
    const circuitBreaker = this.getCircuitBreaker(service);
    const baseURL = this.registry.getInstance(service);

    return await circuitBreaker.execute(async () => {
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
          timeout: options.timeout || 10000,
          retryCount: 3,
          retryOnStatusCode: true
        }
      );

      const response = await request.handle();
      return response.data;
    });
  }

  getHealth() {
    const circuitBreakerStates: Record<string, any> = {};
    this.circuitBreakers.forEach((cb, service) => {
      circuitBreakerStates[service] = cb.getState();
    });

    return {
      services: this.registry.getAll(),
      circuitBreakers: circuitBreakerStates,
      timestamp: new Date().toISOString()
    };
  }
}

// src/index.ts
import express from 'express';
import { GatewayService } from './services/gateway.service';

const app = express();
const gateway = new GatewayService();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json(gateway.getHealth());
});

// User routes
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await gateway.call('users', `/users/${req.params.id}`);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Order routes
app.post('/api/orders', async (req, res) => {
  try {
    // Validate user exists
    await gateway.call('users', `/users/${req.body.userId}`);
    
    // Create order
    const order = await gateway.call('orders', '/orders', {
      method: 'POST',
      data: req.body
    });
    
    // Process payment
    const payment = await gateway.call('payments', '/payments', {
      method: 'POST',
      data: {
        orderId: order.id,
        amount: order.total
      }
    });

    res.json({ order, payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Gateway running on port ${PORT}`);
});
```

---