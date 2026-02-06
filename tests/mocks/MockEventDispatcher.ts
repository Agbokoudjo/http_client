export class MockEventDispatcher {
    private listeners: Map<string, Function[]> = new Map();
    public dispatchedEvents: Array<{ event: any; eventName: string }> = [];

    dispatch<T>(event: T, eventName?: string): T {
        this.dispatchedEvents.push({ event, eventName: eventName || '' });
        const listeners = this.listeners.get(eventName || '') || [];
        for (const listener of listeners) {
            listener(event);
            if ((event as any).isPropagationStopped?.()) break;
        }
        return event;
    }

    addListener(eventName: string, listener: Function): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName)!.push(listener);
    }

    removeListener(eventName: string, listener: Function): void {
        const listeners = this.listeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        }
    }

    hasListeners(eventName?: string): boolean {
        return this.listeners.has(eventName || '');
    }

    reset(): void {
        this.dispatchedEvents = [];
    }
}
