import { describe, it, expect, vi, beforeEach ,afterEach} from 'vitest';
import {
    FetchRequest,
    FetchResponse,
    HttpClientEvents,
    FetchRequestEvent,
    FetchResponseEvent,
    FetchRequestErrorEvent,
    TerminateEvent,
    HttpFetchError,
    RequestType,
    EventTargetType,
    safeFetch,
    mapStatusToResponseType,
    isClientError,
    isServerError,
    responseTypeHandle,
    parseHttpErrorResponse,
    HttpResponse
} from '../../src';
import {
    EventDispatcherInterface,
    createEventDispatcher
} from '@wlindabla/event_dispatcher';

import { MockFetchDelegate } from "../mocks";



describe('HTTP Events', () => {
    describe('FetchRequestEvent', () => {
        it('should create event with correct properties', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const mockOptions= { url:"https://api.example.com/test", method: 'GET' };
            const resolve = vi.fn();
            const reject = vi.fn();

            const event = new FetchRequestEvent(
                mockRequest,
                'https://api.example.com/test',
                mockOptions,
                resolve,
                reject,
                RequestType.MAIN
            );

            expect(event.getUrl()).toBe('https://api.example.com/test');
            expect(event.getFetchOptions()).toEqual(mockOptions);
            expect(event.isMainRequest()).toBe(true);
            expect(event.isSubRequest()).toBe(false);
        });

        it('should allow URL modification', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const resolve = vi.fn();
            const reject = vi.fn();

            const event = new FetchRequestEvent(
                mockRequest,
                'https://api.example.com/test',
                { url:"https://api.example.com/test"},
                resolve,
                reject
            );

            event.setUrl('https://api.example.com/modified');
            expect(event.getUrl()).toBe('https://api.example.com/modified');
        });

        it('should merge fetch options correctly', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const resolve = vi.fn();
            const reject = vi.fn();

            const event = new FetchRequestEvent(
                mockRequest,
                'https://api.example.com/test',
                {
                    url: "https://api.example.com/test",
                    headers: { 'X-Original': 'value1' }
                },
                resolve,
                reject
            );

            event.mergeFetchOptions({
                headers: { 'X-New': 'value2' }
            });

            const options = event.getFetchOptions();
            expect(options.headers).toEqual({
                'X-Original': 'value1',
                'X-New': 'value2'
            });
        });

        it('should call resolve when resolve() is called', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const resolve = vi.fn();
            const reject = vi.fn();

            const event = new FetchRequestEvent(
                mockRequest,
                'https://api.example.com/test',
                {
                    url:"https://api.example.com/test",
                    methodSend:"GET"
                },
                resolve,
                reject
            );

            event.resolve({ data: 'test' });
            expect(resolve).toHaveBeenCalledWith({ data: 'test' });
            expect(event.isPropagationStopped()).toBe(true);
        });
    });

    describe('FetchResponseEvent', () => {
        it('should create and modify response', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const mockResponse = new HttpResponse(new Response(),{ test: 'data' });

            const event = new FetchResponseEvent(
                mockRequest,
                mockResponse as any,
                RequestType.MAIN
            );

            expect(event.getResponse()).toBe(mockResponse);

            const newResponse = new HttpResponse(new Response(),{ new: 'data' });
            event.setResponse(newResponse as any);
            expect(event.getResponse()).toBe(newResponse);
        });
    });

    describe('FetchRequestErrorEvent', () => {
        it('should handle error recovery', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const error = new Error('Test error');

            const event = new FetchRequestErrorEvent(
                mockRequest,
                error,
                RequestType.MAIN
            );

            expect(event.getError()).toBe(error);
            expect(event.isRecovered()).toBe(false);
            expect(event.hasResponse()).toBe(false);

            const mockResponse = new HttpResponse(new Response(),{ fallback: true });
            event.setResponse(mockResponse as any);

            expect(event.isRecovered()).toBe(true);
            expect(event.hasResponse()).toBe(true);
        });
    });

    describe('TerminateEvent', () => {
        it('should track request success', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const mockResponse = new  HttpResponse(new Response(),{ data: 'test' });

            const event = new TerminateEvent(
                mockRequest,
                mockResponse as any,
                null,
                RequestType.MAIN
            );

            expect(event.isSuccessful()).toBe(true);
            expect(event.getResponse()).toBe(mockResponse);
            expect(event.getError()).toBe(null);
        });

        it('should track request failure', () => {
            const mockRequest = new Request('https://api.example.com/test');
            const error = new Error('Test error');

            const event = new TerminateEvent(
                mockRequest,
                null,
                error,
                RequestType.MAIN
            );

            expect(event.isSuccessful()).toBe(false);
            expect(event.getResponse()).toBe(null);
            expect(event.getError()).toBe(error);
        });
    });
});


describe('FetchResponse', () => {
    it('should parse status correctly', () => {
        const mockData = { test: 'data' };
        const mockResponse = new Response(JSON.stringify(mockData), {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' }
        });

        const fetchResponse = new HttpResponse(mockResponse,mockData);

        expect(fetchResponse.statusCode).toBe(200);
        expect(fetchResponse.status).toBe(200);
        expect(fetchResponse.statusText).toBe('OK');
        expect(fetchResponse.ok).toBe(true);
        expect(fetchResponse.succeeded).toBe(true);
        expect(fetchResponse.failed).toBe(false);
    });

    it('should identify client errors', () => {
        const mockResponse = new Response('', { status: 404 });
        const fetchResponse = new HttpResponse(mockResponse,null);

        expect(fetchResponse.clientError).toBe(true);
        expect(fetchResponse.serverError).toBe(false);
        expect(fetchResponse.failed).toBe(true);
        expect(fetchResponse.succeeded).toBe(false);
    });

    it('should identify server errors', () => {
        const mockResponse = new Response('', { status: 500 });
        const fetchResponse = new HttpResponse(mockResponse, null);

        expect(fetchResponse.serverError).toBe(true);
        expect(fetchResponse.clientError).toBe(false);
        expect(fetchResponse.failed).toBe(true);
    });

    it('should detect HTML content', () => {
        const mockResponse = new Response('', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
        });
        const fetchResponse = new HttpResponse(mockResponse, '');

        expect(fetchResponse.isHTML).toBe(true);
        expect(fetchResponse.contentType).toContain('text/html');
    });

    it('should get headers correctly', () => {
        const mockResponse = new Response('', {
            headers: {
                'content-type': 'application/json',
                'x-custom': 'test-value'
            }
        });
        const fetchResponse = new HttpResponse(mockResponse, {});

        expect(fetchResponse.header('content-type')).toBe('application/json');
        expect(fetchResponse.header('x-custom')).toBe('test-value');
        expect(fetchResponse.header('non-existent')).toBe(null);
    });
});

// ============================================================================
// TESTS DE safeFetch
// ============================================================================

describe('safeFetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should make successful GET request', async () => {
        const mockData = { users: [{ id: 1, name: 'John' }] };
  

        const response = await safeFetch({
            url: 'https://api.example.com/users',
            methodSend: 'GET',
            responseType: 'json'
        });

        expect(response.data).toEqual(mockData);
        expect(response.succeeded).toBe(true);
        expect(response.statusCode).toBe(200);
    });

    it('should make successful POST request with JSON body', async () => {
        const requestData = { name: 'New User' };
        const responseData = { id: 1, ...requestData };

    

        const response = await safeFetch({
            url: 'https://api.example.com/users',
            methodSend: 'POST',
            data: requestData,
            responseType: 'json'
        });

        expect(response.data).toEqual(responseData);
        expect(response.statusCode).toBe(201);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.example.com/users',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(requestData)
            })
        );
    });

    it('should handle FormData correctly', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test']), 'test.txt');

       

        const response = await safeFetch({
            url: 'https://api.example.com/upload',
            methodSend: 'POST',
            data: formData,
            responseType: 'json'
        });

        expect(response.succeeded).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.example.com/upload',
            expect.objectContaining({
                method: 'POST',
                body: formData
            })
        );
    });

    it('should retry on network error', async () => {
        let callCount = 0;
    
        const response = await safeFetch({
            url: 'https://api.example.com/test',
            methodSend: 'GET',
            retryCount: 3,
            responseType: 'json'
        });

        expect(callCount).toBe(3);
        expect(response.succeeded).toBe(true);
    });

    it('should handle timeout', async () => {
      

        await expect(
            safeFetch({
                url: 'https://api.example.com/slow',
                methodSend: 'GET',
                timeout: 100,
                retryCount: 1
            })
        ).rejects.toThrow('timed out');
    });

    it('should handle 404 error without retry', async () => {
     

        const response = await safeFetch({
            url: 'https://api.example.com/notfound',
            methodSend: 'GET',
            retryCount: 3,
            responseType: 'json'
        });

        expect(response.statusCode).toBe(404);
        expect(response.clientError).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Pas de retry pour 4xx
    });

    it('should retry on 500 error with retryOnStatusCode', async () => {
        let callCount = 0;
     
        const response = await safeFetch({
            url: 'https://api.example.com/unstable',
            methodSend: 'GET',
            retryCount: 3,
            retryOnStatusCode: true,
            responseType: 'json'
        });

        expect(callCount).toBe(3);
        expect(response.succeeded).toBe(true);
    });
});


describe('FetchRequest', () => {
    let mockDelegate: MockFetchDelegate;
    let mockDispatcher: EventDispatcherInterface;

    beforeEach(() => {
        mockDelegate = new MockFetchDelegate();
        mockDispatcher = createEventDispatcher();
        vi.clearAllMocks();
    });

    it('should execute complete request lifecycle', async () => {
        const mockData = { test: 'data' };
    

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/test',
                methodSend: 'GET',
                responseType: 'json'
            }
        );

        const response = await request.handle();

        // Vérifier les appels du delegate
        expect(mockDelegate.calls.prepareRequest).toHaveLength(1);
        expect(mockDelegate.calls.requestStarted).toHaveLength(1);
        expect(mockDelegate.calls.requestFinished).toHaveLength(1);
        expect(mockDelegate.calls.requestSucceeded).toHaveLength(1);

        // Vérifier les événements dispatché
        //const eventNames = mockDispatcher.dispatchedEvents.map(e => e.eventName);
        expect(request).toContain(HttpClientEvents.REQUEST);
        expect(request).toContain(HttpClientEvents.BEFORE_SEND);
        expect(request).toContain(HttpClientEvents.RESPONSE);
        expect(request).toContain(HttpClientEvents.TERMINATE);

        // Vérifier la réponse
        expect(response.data).toEqual(mockData);
        expect(response.succeeded).toBe(true);
    });

    it('should allow request interception via event', async () => {
        const mockInterceptedResponse = { intercepted: true };

        mockDispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            event.resolve(new HttpResponse(new Response() ,mockInterceptedResponse));
        });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/test',
                methodSend: 'GET'
            }
        );

        const response = await request.handle();

        // La vraie requête ne devrait pas avoir été faite
        expect(mockDelegate.calls.requestStarted).toHaveLength(1);
        expect(response.data).toEqual(mockInterceptedResponse);
    });

    it('should allow URL modification via event', async () => {
        const originalUrl = 'https://api.example.com/test';
        const modifiedUrl = 'https://api.example.com/modified';

        mockDispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            event.setUrl(modifiedUrl);
        });

      

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: originalUrl,
                methodSend: 'GET'
            }
        );

        await request.handle();

        expect(global.fetch).toHaveBeenCalledWith(
            modifiedUrl,
            expect.any(Object)
        );
    });

    it('should add authentication header via BEFORE_SEND event', async () => {
        mockDispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchRequestEvent) => {
            event.mergeFetchOptions({
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });
        });

     
        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/protected',
                methodSend: 'GET'
            }
        );

        await request.handle();

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.example.com/protected',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-token'
                })
            })
        );
    });

    it('should handle errors and dispatch ERROR event', async () => {
        const testError = new Error('Network failure');
        global.fetch = vi.fn().mockRejectedValue(testError);

        let errorEventDispatched = false;
        mockDispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
            errorEventDispatched = true;
            expect(event.getError()).toBe(testError);
        });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/error',
                methodSend: 'GET',
                retryCount: 1
            }
        );

        await expect(request.handle()).rejects.toThrow('Network failure');
        expect(errorEventDispatched).toBe(true);
        expect(mockDelegate.calls.requestErrored).toHaveLength(1);
    });

    it('should recover from error via ERROR event', async () => {
        const fallbackData = { fallback: true };
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        mockDispatcher.addListener(HttpClientEvents.ERROR, (event: FetchRequestErrorEvent) => {
            // Récupérer avec une réponse de fallback
            event.setResponse(new HttpResponse(new Response() ,fallbackData) as any);
        });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/test',
                methodSend: 'GET',
                retryCount: 1
            }
        );

        const response = await request.handle();

        expect(response.data).toEqual(fallbackData);
        expect(mockDelegate.calls.requestErrored).toHaveLength(0); // Pas d'erreur car récupéré
    });

    it('should cancel request', async () => {

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/slow',
                methodSend: 'GET'
            }
        );

        // Annuler après 100ms
        setTimeout(() => request.cancel(), 100);

        await expect(request.handle()).rejects.toThrow('cancelled');
        expect(request.isCancelled()).toBe(true);
    });

    it('should dispatch TERMINATE event on success', async () => {
       
        let terminateEventData: any = null;
        mockDispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
            terminateEventData = {
                successful: event.isSuccessful(),
                hasResponse: event.getResponse() !== null,
                hasError: event.getError() !== null
            };
        });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/test',
                methodSend: 'GET'
            }
        );

        await request.handle();

        expect(terminateEventData).toEqual({
            successful: true,
            hasResponse: true,
            hasError: false
        });
    });

    it('should dispatch TERMINATE event on error', async () => {

        let terminateEventData: any = null;
        mockDispatcher.addListener(HttpClientEvents.TERMINATE, (event: TerminateEvent) => {
            terminateEventData = {
                successful: event.isSuccessful(),
                hasResponse: event.getResponse() !== null,
                hasError: event.getError() !== null
            };
        });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: 'https://api.example.com/test',
                methodSend: 'GET',
                retryCount: 1
            }
        );

        try {
            await request.handle();
        } catch (error) {
            // Expected error
        }

        expect(terminateEventData).toEqual({
            successful: false,
            hasResponse: false,
            hasError: true
        });
    });
});


describe('Integration Tests', () => {
    let mockDelegate: MockFetchDelegate;
    let mockDispatcher: EventDispatcherInterface;

    beforeEach(() => {
        mockDelegate = new MockFetchDelegate();
        mockDispatcher = createEventDispatcher();
        vi.clearAllMocks();
    });

    it('should implement caching mechanism', async () => {
        const cache = new Map<string, any>();

        // Cache interceptor
        mockDispatcher.addListener(HttpClientEvents.REQUEST, (event: FetchRequestEvent) => {
            const url = event.getUrl().toString();
            if (cache.has(url)) {
                event.resolve(cache.get(url));
            }
        });

        mockDispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
            const url = event.getRequest().url;
            cache.set(url, event.getResponse());
        });

        const url = 'https://api.example.com/cached';

        // Première requête - devrait faire le fetch
        const request1 = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            { url, methodSend: 'GET' }
        );
        const response1 = await request1.handle();

        expect(response1.data).toEqual({ data: 'original' });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Deuxième requête - devrait utiliser le cache
        const request2 = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            { url, methodSend: 'GET' }
        );
        const response2 = await request2.handle();

        expect(response2.data).toEqual({ data: 'original' });
        expect(global.fetch).toHaveBeenCalledTimes(1); // Toujours 1, pas de nouveau fetch
    });

})