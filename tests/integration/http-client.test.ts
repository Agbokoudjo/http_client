import { describe, it, expect, beforeEach } from 'vitest';
import {MockFetchDelegate } from '../mocks';
import { FetchRequest } from "../../src";
import { EventDispatcherInterface, createEventDispatcher } from "@wlindabla/event_dispatcher";

describe('HTTP Client Integration', () => {
    let dispatcher: EventDispatcherInterface;
    let delegate: MockFetchDelegate;

    beforeEach(() => {
        dispatcher =createEventDispatcher();
        delegate = new MockFetchDelegate();
    });

    it('should make successful request', async () => {
        const request = new FetchRequest(
            delegate,
            dispatcher,
            { url: 'https://api.example.com/test', methodSend: 'GET' }
        );

        const response = await request.handle();
        expect(response.succeeded).toBe(true);
    });
});