# Integration Examples — @wlindabla/http_client

> **[← Back to README](../README.md)**  
> See also: [Architecture](./ARCHITECTURE.md) | [API Reference](./API.md) | [Events](./EVENTS.md) | [Error Handling](./ERROR_HANDLING.md)

---

## Table of Contents

- [Vanilla JavaScript (Browser)](#vanilla-javascript-browser)
- [TypeScript (Browser)](#typescript-browser)
- [Node.js](#nodejs)
- [React](#react)
- [Angular](#angular)
- [Vue 3](#vue-3)
- [Svelte](#svelte)
- [Next.js (App Router)](#nextjs-app-router)
- [Calling from PHP (server-side)](#calling-from-php-server-side)
- [Calling from Python (server-side)](#calling-from-python-server-side)
- [Symfony + Sonata Admin integration](#symfony--sonata-admin-integration)

---

## Vanilla JavaScript (Browser)

### Simple GET request

```javascript
import { safeFetch } from '@wlindabla/http_client/core';

async function loadUsers() {
  const response = await safeFetch({
    url: '/api/users',
    methodSend: 'GET',
    responseType: 'json',
    timeout: 10000,
    retryCount: 3,
  });

  if (response.succeeded) {
    const ul = document.getElementById('user-list');
    response.data.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.name;
      ul.appendChild(li);
    });
  } else {
    console.warn('Failed:', response.statusCode, response.data);
  }
}

loadUsers();

**[see the documentation of the function safeFetch](./docs/safeFetch.md)** 
```

### POST with FormData (file upload)

```javascript
import { safeFetch } from '@wlindabla/http_client/core';

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);

  const response = await safeFetch({
    url: '/api/upload',
    methodSend: 'POST',
    data: form,           // Content-Type header removed automatically
    responseType: 'json',
  });

  if (response.succeeded) {
    alert('Upload successful: ' + response.data.filename);
  }
});

**[see the documentation of the function safeFetch](./docs/safeFetch.md)** 
```

### Full lifecycle with events

```javascript
import {
  FetchRequest,
  HttpClientEvents,
  RequestType,
  EventTargetType,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher()  ;

// Inject CSRF token
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event) => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  if (csrf) event.mergeFetchOptions({ headers: { 'X-CSRF-TOKEN': csrf } });
});

// Show/hide spinner via delegate
class UiDelegate {
  prepareRequest()   { document.getElementById('spinner').hidden = false; }
  requestStarted()   {}
  requestFinished()  { document.getElementById('spinner').hidden = true; }
  requestSucceededWithResponse(req, res) { console.log('OK', res.statusCode); }
  requestFailedWithResponse(req, res)    { console.warn('FAIL', res.statusCode); }
  requestPreventedHandlingResponse()     {}
  requestErrored(req, err)               { alert('Error: ' + err.message); }
}

const request = new FetchRequest(
  new UiDelegate(),
  dispatcher,
  {
    url: '/api/products',
    methodSend: 'GET',
    responseType: 'json',
    timeout: 15000,
  },
  RequestType.MAIN,
  { type: EventTargetType.DOCUMENT, instance: document }
);

const response = await request.handle();
console.log('Products:', response.data);
```

---

## TypeScript (Browser)

```typescript
import {
  safeFetch,
  FetchRequest,
  FetchDelegateInterface,
  FetchResponseInterface,
  HttpClientEvents,
  FetchBeforeSendEvent,
  FetchResponseEvent,
  TerminateEvent,
  RequestType,
  HttpFetchError,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher();

// Typed response
interface User {
  id: number;
  name: string;
  email: string;
}

// Using safeFetch with explicit typing
async function getUser(id: number): Promise<User | null> {
  const res = await safeFetch<'json'>({
    url: `/api/users/${id}`,
    responseType: 'json',
    timeout: 8000,
    retryCount: 2,
  });

  if (res.succeeded) {
    return res.data as User;
  }
  return null;
}

// Custom delegate
class AppDelegate implements FetchDelegateInterface {
  constructor(private readonly button: HTMLButtonElement) {}

  prepareRequest(_req: FetchRequest): void { this.button.disabled = true; }
  requestStarted(_req: FetchRequest): void {}
  requestFinished(_req: FetchRequest): void { this.button.disabled = false; }
  requestSucceededWithResponse(_req: FetchRequest, res: FetchResponseInterface): void {
    console.log(`[HTTP] ${_req.method} ${_req.url} → ${res.statusCode}`);
  }
  requestFailedWithResponse(_req: FetchRequest, res: FetchResponseInterface): void {
    console.warn(`[HTTP] FAILED ${_req.url} → ${res.statusCode}`);
  }
  requestPreventedHandlingResponse(_req: FetchRequest, _res: FetchResponseInterface): void {}
  requestErrored(_req: FetchRequest, error: Error): void {
    console.error(`[HTTP] ERROR ${_req.url}`, error.message);
  }
}

// Dispatcher setup
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher()  ;

dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
  }
});

dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  console.info('[HTTP DONE]', event.isSuccessful(), event.getRequest().url);
});

// Execute
const btn = document.getElementById('save-btn') as HTMLButtonElement;

const request = new FetchRequest(
  new AppDelegate(btn),
  dispatcher,
  {
    url: '/api/users',
    methodSend: 'POST',
    data: { name: 'Bob', email: 'bob@example.com' },
    responseType: 'json',
    timeout: 10000,
    retryCount: 3,
  },
  RequestType.MAIN
);

try {
  const response = await request.handle();
  if (response.succeeded) {
    const user = response.data as User;
    console.log('Created user:', user.id, user.name);
  }
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.error('Request failed:', error.message, 'URL:', error.url);
  }
}
```

---

## Node.js

Node.js 18+ includes native `fetch`. For older versions, install `cross-fetch`.

```typescript
// node-http-example.ts
import {
  safeFetch,
  FetchRequest,
  HttpClientEvents,
  FetchBeforeSendEvent,
  TerminateEvent,
  RequestType,
  EventTargetType,
  HttpFetchError,
} from '@wlindabla/http_client';
import { NodeEventDispatcher } from '@wlindabla/event_dispatcher/node';

const dispatcher = new NodeEventDispatcher() ;

import { EventEmitter } from 'node:events';

// ── Simple usage ──────────────────────────────────────────────────────────────

const res = await safeFetch({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  responseType: 'json',
  timeout: 10000,
  retryCount: 3,
});

console.log(res.statusCode, res.data);

// ── With lifecycle events ─────────────────────────────────────────────────────

const emitter = new EventEmitter();
const dispatcher = new  NodeEventDispatcher() ;

// Inject API key from environment
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  event.mergeFetchOptions({
    headers: { 'X-API-Key': process.env.MY_API_KEY ?? '' },
  });
});

// Logging
dispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
  const status = event.getResponse()?.statusCode ?? 'ERR';
  const method = event.getRequest().method;
  const url    = event.getRequest().url;
  console.log(`[HTTP] ${method} ${url} → ${status}`);
});

const request = new FetchRequest(
  undefined,
  dispatcher,
  {
    url: 'https://api.example.com/data',
    methodSend: 'GET',
    responseType: 'json',
    timeout: 15000,
    retryCount: 3,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  RequestType.MAIN,
  { type: EventTargetType.EVENT_EMITTER, instance: emitter }
);

try {
  const response = await request.handle();
  console.log('Data:', JSON.stringify(response.data, null, 2));
} catch (error) {
  if (error instanceof HttpFetchError) {
    console.error('Failed after retries:', error.message);
    process.exit(1);
  }
}
```

### Node.js with older versions (cross-fetch)

```bash
npm install cross-fetch
```

```typescript
import 'cross-fetch/polyfill'; // must be the first import
import { safeFetch } from '@wlindabla/http_client';

const res = await safeFetch({ url: 'https://api.example.com', responseType: 'json' });
```

---

## React

### Custom hook

```typescript
// hooks/useHttpClient.ts
import { useState, useCallback, useRef } from 'react';
import {
  FetchRequest,
  FetchDelegateInterface,
  FetchResponseInterface,
  FetchRequestOptions,
  HttpFetchError,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher() ;


export function useHttpClient<T = unknown>(dispatcher: EventDispatcher) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const requestRef = useRef<FetchRequest | null>(null);

  const delegate: FetchDelegateInterface = {
    prepareRequest: () => {},
    requestStarted: () => setLoading(true),
    requestFinished: () => setLoading(false),
    requestSucceededWithResponse: (_req, res) => setData(res.data as T),
    requestFailedWithResponse: (_req, res) => setError(`HTTP ${res.statusCode}`),
    requestPreventedHandlingResponse: () => {},
    requestErrored: (_req, err) => setError(err.message),
  };

  const send = useCallback(async (options: FetchRequestOptions) => {
    setError(null);
    const request = new FetchRequest(delegate, dispatcher, options);
    requestRef.current = request;

    try {
      const response = await request.handle();
      return response;
    } catch (err) {
      if (err instanceof HttpFetchError) setError(err.message);
      return null;
    }
  }, [dispatcher]);

  const cancel = useCallback(() => {
    requestRef.current?.cancel();
  }, []);

  return { loading, error, data, send, cancel };
}
```

### Component example

```tsx
// components/UserList.tsx
import React, { useEffect } from 'react';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher() ;

import { HttpClientEvents, FetchBeforeSendEvent } from '@wlindabla/http_client';
import { useHttpClient } from '../hooks/useHttpClient';

interface User { id: number; name: string; email: string; }

dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const token = localStorage.getItem('token');
  if (token) event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
});

export function UserList() {
  const { loading, error, data, send } = useHttpClient<User[]>(dispatcher);

  useEffect(() => {
    send({ url: '/api/users', methodSend: 'GET', responseType: 'json' });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!data)   return null;

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name} — {user.email}</li>
      ))}
    </ul>
  );
}
```

### POST form submission

```tsx
import React, { useState } from 'react';
import { safeFetch } from '@wlindabla/http_client/core';

export function CreateUserForm() {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const res = await safeFetch({
      url: '/api/users',
      methodSend: 'POST',
      data: { name },
      responseType: 'json',
      timeout: 10000,
    });

    setStatus(res.succeeded ? 'done' : 'error');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Saving…' : 'Save'}
      </button>
      {status === 'done'  && <p style={{ color: 'green' }}>User created!</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Something went wrong.</p>}
    </form>
  );
}
```

---

## Angular

### HTTP Service

```typescript
// services/api.service.ts
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import {
  FetchRequest,
  FetchDelegateInterface,
  FetchResponseInterface,
  HttpClientEvents,
  FetchBeforeSendEvent,
  TerminateEvent,
  HttpFetchError,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

const dispatcher = new  BrowserEventDispatcher()  ;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private dispatcher: EventDispatcher;

  constructor(/* inject AuthService, LoadingService here */) {
    this.dispatcher =dispatcher;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Inject Bearer token
    this.dispatcher.addListener(
      HttpClientEvents.BEFORE_SEND,
      (event: FetchBeforeSendEvent) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
        }
      }
    );

    // Logging
    this.dispatcher.addListener(
      HttpClientEvents.TERMINATE,
      (event: TerminateEvent) => {
        console.debug('[API]', event.getRequest().url, event.isSuccessful());
      }
    );
  }

  get<T>(url: string): Observable<T> {
    return from(this.execute<T>(url, 'GET'));
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return from(this.execute<T>(url, 'POST', body));
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return from(this.execute<T>(url, 'PUT', body));
  }

  delete<T>(url: string): Observable<T> {
    return from(this.execute<T>(url, 'DELETE'));
  }

  private async execute<T>(url: string, method: string, data?: unknown): Promise<T> {
    const request = new FetchRequest(undefined, this.dispatcher, {
      url,
      methodSend: method as any,
      data,
      responseType: 'json',
      timeout: 15000,
      retryCount: 3,
    });

    const response = await request.handle();

    if (response.clientError || response.serverError) {
      throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`);
    }

    return response.data as T;
  }
}
```

### Using in a component

```typescript
// components/user-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';

interface User { id: number; name: string; email: string; }

@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading">Loading...</div>
    <ul *ngIf="!loading">
      <li *ngFor="let user of users">{{ user.name }}</li>
    </ul>
  `,
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<User[]>('/api/users').subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: (err) => { console.error(err); this.loading = false; },
    });
  }
}
```

---

## Vue 3

### Composable

```typescript
// composables/useApi.ts
import { ref } from 'vue';
import {
  FetchRequest,
  HttpClientEvents,
  FetchBeforeSendEvent,
  FetchRequestOptions,
  HttpFetchError,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';
const dispatcher = new  BrowserEventDispatcher();

dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const token = localStorage.getItem('token');
  if (token) event.mergeFetchOptions({ headers: { Authorization: `Bearer ${token}` } });
});

export function useApi<T = unknown>() {
  const data    = ref<T | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function request(options: FetchRequestOptions) {
    loading.value = true;
    error.value   = null;

    try {
      const req = new FetchRequest(undefined, dispatcher, options);
      const res = await req.handle();

      if (res.succeeded) {
        data.value = res.data as T;
      } else {
        error.value = `HTTP ${res.statusCode}`;
      }
    } catch (err) {
      error.value = err instanceof HttpFetchError ? err.message : 'Unexpected error';
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, request };
}
```

### Component (Composition API)

```vue
<!-- UserList.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useApi } from '../composables/useApi';

interface User { id: number; name: string; }

const { data: users, loading, error, request } = useApi<User[]>();

onMounted(() => {
  request({ url: '/api/users', methodSend: 'GET', responseType: 'json' });
});
</script>

<template>
  <div v-if="loading">Loading…</div>
  <p v-if="error" class="error">{{ error }}</p>
  <ul v-if="users">
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

---

## Svelte

```svelte
<!-- UserList.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { safeFetch } from '@wlindabla/http_client';

  interface User { id: number; name: string; }

  let users: User[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    const res = await safeFetch({
      url: '/api/users',
      responseType: 'json',
      timeout: 10000,
    });

    if (res.succeeded) {
      users = res.data as User[];
    } else {
      error = `Failed: HTTP ${res.statusCode}`;
    }
    loading = false;
  });
</script>

{#if loading}
  <p>Loading…</p>
{:else if error}
  <p style="color:red">{error}</p>
{:else}
  <ul>
    {#each users as user}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

---

## Next.js (App Router)

### Server Component (server-side fetch)

```typescript
// app/users/page.tsx
import { safeFetch } from '@wlindabla/http_client/core';

interface User { id: number; name: string; email: string; }

export default async function UsersPage() {
  const res = await safeFetch({
    url: `${process.env.API_BASE_URL}/users`,
    responseType: 'json',
    timeout: 10000,
    retryCount: 3,
    headers: {
      Authorization: `Bearer ${process.env.API_SECRET}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!res.succeeded) {
    return <p>Failed to load users (HTTP {res.statusCode})</p>;
  }

  const users = res.data as User[];

  return (
    <main>
      <h1>Users</h1>
      <ul>
        {users.map(u => <li key={u.id}>{u.name}</li>)}
      </ul>
    </main>
  );
}
```

### Client Component (with event dispatcher)

```typescript
'use client';
// app/components/CreateUser.tsx
import { useState } from 'react';
import { FetchRequest, HttpClientEvents, FetchBeforeSendEvent } from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

const dispatcher = new  BrowserEventDispatcher()  ;

dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  event.mergeFetchOptions({ headers: { 'X-Source': 'next-client' } });
});

export function CreateUser() {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    const req = new FetchRequest(undefined, dispatcher, {
      url: '/api/users',
      methodSend: 'POST',
      data: { name },
      responseType: 'json',
    });
    const res = await req.handle();
    if (res.succeeded) alert('User created!');
  };

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button onClick={handleSubmit}>Create</button>
    </div>
  );
}
```

---

## Calling from PHP (server-side)

`@wlindabla/http_client` is a JavaScript/TypeScript library. To call a backend that uses it from PHP, you simply make HTTP requests to the endpoints it exposes, or use PHP's HTTP clients on the server side.

However, if you're building a **Symfony application** that serves a frontend using this library, here's how the PHP side sets up the API the library calls:

```php
<?php
// src/Controller/UserApiController.php
namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users', name: 'api_users_')]
class UserApiController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json([
            ['id' => 1, 'name' => 'Alice', 'email' => 'alice@example.com'],
            ['id' => 2, 'name' => 'Bob',   'email' => 'bob@example.com'],
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        // validate, persist…

        return $this->json(['id' => 3, ...$data], 201);
    }
}
```

The library on the frontend calls this endpoint:

```typescript
const res = await safeFetch({
  url: '/api/users',
  methodSend: 'POST',
  data: { name: 'Charlie', email: 'charlie@example.com' },
  responseType: 'json',
});
```

### PHP calling a JS API (Guzzle)

If you need PHP to call an API built with this library on Node.js:

```php
<?php
use GuzzleHttp\Client;

$client = new Client(['base_uri' => 'http://localhost:3000']);

$response = $client->post('/api/users', [
    'json'    => ['name' => 'Alice'],
    'headers' => ['Authorization' => 'Bearer ' . $token],
    'timeout' => 15,
]);

$user = json_decode($response->getBody()->getContents(), true);
echo $user['id'];
```

---

## Calling from Python (server-side)

Same principle — Python calls APIs; the library runs in the browser or Node.js.

### Python calling the API (httpx — recommended)

```python
import httpx
import asyncio

async def create_user(name: str, email: str, token: str) -> dict:
    async with httpx.AsyncClient(base_url="https://api.example.com") as client:
        response = await client.post(
            "/api/users",
            json={"name": name, "email": email},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=15.0,
        )
        response.raise_for_status()
        return response.json()

# Usage
user = asyncio.run(create_user("Alice", "alice@example.com", "my-jwt-token"))
print(user)
```

### Python calling with requests (synchronous)

```python
import requests

def fetch_users(base_url: str, token: str) -> list:
    response = requests.get(
        f"{base_url}/api/users",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()

users = fetch_users("https://api.example.com", "my-token")
for user in users:
    print(user["name"])
```

### Django REST Framework — serving the API

```python
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
def user_list(request):
    users = [
        {"id": 1, "name": "Alice", "email": "alice@example.com"},
        {"id": 2, "name": "Bob",   "email": "bob@example.com"},
    ]
    return Response(users, status=status.HTTP_200_OK)

@api_view(['POST'])
def user_create(request):
    name  = request.data.get('name')
    email = request.data.get('email')
    # validate, save to DB…
    return Response({"id": 3, "name": name, "email": email}, status=status.HTTP_201_CREATED)
```

The JS frontend calls this endpoint with:

```typescript
const res = await safeFetch({
  url: 'http://localhost:8000/api/users',
  methodSend: 'POST',
  data: { name: 'Charlie', email: 'charlie@example.com' },
  responseType: 'json',
  headers: {
    Authorization: 'Bearer my-token',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
```

---

## Symfony + Sonata Admin integration

This library was originally designed to work alongside Symfony's Sonata Admin. Here's a typical integration pattern.

```typescript
// assets/admin/http-setup.ts
import {
  FetchRequest,
  FetchDelegateInterface,
  FetchResponseInterface,
  HttpClientEvents,
  FetchBeforeSendEvent,
  FetchResponseEvent,
  TerminateEvent,
  FetchRequestErrorEvent,
  FetchErrorTranslator,
  RequestType,
  EventTargetType,
} from '@wlindabla/http_client';
import { BrowserEventDispatcher } from '@wlindabla/event_dispatcher/browser';

const dispatcher = new  BrowserEventDispatcher()  ;

import { LocalStorageCacheAdapter } from './adapters/LocalStorageCacheAdapter';

// ── Translation setup ─────────────────────────────────────────────────────────

const translator = FetchErrorTranslator.getInstance({
  defaultLanguage: document.documentElement.lang || 'en',
  cacheAdapter: new LocalStorageCacheAdapter(),
});

// ── Event dispatcher ──────────────────────────────────────────────────────────

// CSRF token (Symfony standard)
dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchBeforeSendEvent) => {
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (csrf) event.mergeFetchOptions({ headers: { 'X-CSRF-TOKEN': csrf } });
});

// Handle 401 → redirect to login
dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
  if (event.getResponse().statusCode === 401) {
    window.location.href = '/admin/login';
  }
});

// Error translation + Sonata toast
dispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
  const msg = translator.trans(event.getError().name, event.getError());
  // Use Sonata's notification system or a simple alert
  console.error('[Sonata HTTP]', msg);
});

// ── Delegate for Sonata UI ────────────────────────────────────────────────────

export class SonataAdminDelegate implements FetchDelegateInterface {
  private loadingEl: HTMLElement | null;

  constructor(private readonly actionName: string) {
    this.loadingEl = document.getElementById(`loading-${actionName}`);
  }

  prepareRequest(_req: FetchRequest): void {}
  requestStarted(_req: FetchRequest): void   { this.loadingEl?.classList.remove('hidden'); }
  requestFinished(_req: Request): void  { this.loadingEl?.classList.add('hidden'); }

  requestSucceededWithResponse(_req: FetchRequest, res: FetchResponseInterface): void {
    console.info(`[Sonata] ${this.actionName} succeeded:`, res.statusCode);
  }
  requestFailedWithResponse(_req:FetchRequest, res: FetchResponseInterface): void {
    console.warn(`[Sonata] ${this.actionName} failed:`, res.statusCode, res.data);
  }
  requestPreventedHandlingResponse(_req:FetchRequest, _res: FetchResponseInterface): void {}
  requestErrored(_req: FetchRequest, error: Error): void {
    console.error(`[Sonata] ${this.actionName} error:`, error.message);
  }
}

// ── Factory function ──────────────────────────────────────────────────────────

export function createAdminRequest(url: string, method = 'GET', data?: unknown): FetchRequest {
  return new FetchRequest(
    new SonataAdminDelegate('default'),
    dispatcher,
    {
      url,
      methodSend: method as any,
      data,
      responseType: 'json',
      timeout: 30000,
      retryCount: 3,
      customOptions: { context: 'sonata-admin' },
    },
    RequestType.MAIN,
    { type: EventTargetType.DOCUMENT, instance: document }
  );
}
```

Usage in a Sonata admin JS file:

```typescript
import { createAdminRequest } from './http-setup';

// Delete a record
async function deleteRecord(id: number): Promise<void> {
  const request = createAdminRequest(`/admin/api/product/${id}/delete`, 'DELETE');
  const response = await request.handle();

  if (response.succeeded) {
    document.getElementById(`row-${id}`)?.remove();
  } else {
    alert(`Delete failed: HTTP ${response.statusCode}`);
  }
}

// Batch action
async function batchAction(ids: number[], action: string): Promise<void> {
  const request = createAdminRequest('/admin/api/batch', 'POST', { ids, action });
  const response = await request.handle();

  if (response.succeeded) {
    window.location.reload();
  }
}
```
