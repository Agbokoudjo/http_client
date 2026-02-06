import { describe, it, expect, beforeAll, afterAll,beforeEach } from 'vitest';
import { FetchRequest } from '../../src';
import { TestServer } from '../helpers/test-server';
import { MockFetchDelegate } from '../mocks';
import { EventDispatcherInterface, createEventDispatcher } from '@wlindabla/event_dispatcher';

describe('Integration Tests with Real Server', () => {
    let server: TestServer;
    let serverUrl: string;
    let mockDelegate: MockFetchDelegate;
    let mockDispatcher: EventDispatcherInterface;

    beforeAll(async () => {
        server = new TestServer();
        const port = await server.start();
        serverUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
        await server.stop();
    });

    beforeEach(() => {
        mockDelegate = new MockFetchDelegate();
        mockDispatcher = createEventDispatcher();
        server.reset();
    });

    it('should make real HTTP request to test server', async () => {
        server.mockResponse('/api/test', 200, { message: 'Hello from server' });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: `${serverUrl}/api/test`,
                methodSend: 'GET',
                responseType: 'json'
            }
        );

        const response = await request.handle();

        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual({ message: 'Hello from server' });
    });

    it('should handle real timeout', async () => {
        server.mockResponse('/api/slow', 200, { data: 'slow response' });

        // Serveur avec délai de 2 secondes
        await server.stop();
        server = new TestServer();
        await server.start({ delay: 2000 });
        server.mockResponse('/api/slow', 200, { data: 'slow response' });

        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: `${serverUrl}/api/slow`,
                methodSend: 'GET',
                timeout: 500, // Timeout de 500ms
                retryCount: 1
            }
        );

        await expect(request.handle()).rejects.toThrow('timed out');
    }, 10000);

    it('should handle real 404 error', async () => {
        const request = new FetchRequest(
            mockDelegate,
            mockDispatcher as any,
            {
                url: `${serverUrl}/api/notfound`,
                methodSend: 'GET'
            }
        );

        const response = await request.handle();

        expect(response.statusCode).toBe(404);
        expect(response.clientError).toBe(true);
    });
});