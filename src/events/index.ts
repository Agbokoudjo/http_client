/*
 * This file is part of the project by AGBOKOUDJO Franck.
 *
 * (c) AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 * Phone: +229 0167 25 18 86
 * LinkedIn: https://www.linkedin.com/in/internationales-web-services-120520193/
 * Github: https://github.com/Agbokoudjo/form_validator
 * Company: INTERNATIONALES WEB APPS & SERVICES
 *
 * For more information, please feel free to contact the author.
 */

import {
    ResponseInterface,
    FetchResponseInterface
} from "../contracts";

import { BaseEvent } from "@wlindabla/event_dispatcher";

import {
    RequestType ,
    EventTargetRequest,
    EventTargetType,
    FetchRequestOptions
} from "../types";

/**
 * Interface for events that can carry a response
 */
export interface ResponseEventInterface {
    /**
     * Returns the response object.
     */
    getResponse(): ResponseInterface | null;

    /**
     * Sets a response and stops event propagation.
     */
    setResponse(response: ResponseInterface | null): void;

    /**
     * Returns whether a response was set.
     */
    hasResponse(): boolean;
}

/**
 * HTTP Client event names - following Symfony naming convention
 */
export class HttpClientEvents {
    /**
     * Dispatched before sending the request
     * Listeners can modify the request or set a response to prevent sending
     */
    public static readonly REQUEST = "http_client.request";

    /**
     * Dispatched just before the fetch call
     * Last chance to modify request options
     */
    public static readonly BEFORE_SEND = "http_client.before_send";

    /**
     * Dispatched when receiving a response
     * Listeners can modify the response
     */
    public static readonly RESPONSE = "http_client.response";

    /**
     * Dispatched when an error occurs during the request
     */
    public static readonly ERROR = "http_client.error";

    /**
     * Dispatched after the response is processed (success or error)
     */
    public static readonly TERMINATE = "http_client.terminate";
}


/**
 * Base class for all HTTP events
 * Inspired by Symfony's KernelEvent
 * 
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export abstract class HttpEvent extends BaseEvent {
    private _defaultPrevented: boolean = false;

    /**
     * @param request - The Request object
     * @param requestType - Type of request (MAIN or SUB)
     */
    protected constructor(
        private readonly request: Request,
        private readonly requestType: RequestType = RequestType.MAIN
    ) {
        super();
    }

    /**
     * Returns the request being processed
     */
    public getRequest(): Request {
        return this.request;
    }

    /**
     * Returns the request type
     */
    public getRequestType(): RequestType {
        return this.requestType;
    }

    /**
     * Checks if this is a main request
     */
    public isMainRequest(): boolean {
        return this.requestType === RequestType.MAIN;
    }

    /**
     * Checks if this is a sub request
     */
    public isSubRequest(): boolean {
        return this.requestType === RequestType.SUB;
    }

    /**
     * Prevents the default action
     */
    public preventDefault(): void {
        this._defaultPrevented = true;
    }

    /**
     * Returns whether the default action was prevented
     */
    public isDefaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    /**
     * Getter for backward compatibility
     */
    public get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    /**
     * Setter for backward compatibility
     */
    public set defaultPrevented(value: boolean) {
        this._defaultPrevented = value;
    }
}

/**
 * Event dispatched at the beginning of request processing
 * Allows listeners to create a response before the request is sent
 */
export abstract class RequestEvent extends HttpEvent implements ResponseEventInterface {
    private response: ResponseInterface | null = null;
    private readonly eventTarget: EventTargetRequest;

    private readonly customOptions: Record<string, any>;

    constructor(
        request: Request,
        requestType: RequestType = RequestType.MAIN,
        eventTarget?: EventTargetRequest,
        customOptions?: Record<string, any>
    ) {
        super(request, requestType);
        this.eventTarget = eventTarget || {
            type: EventTargetType.UNKNOWN,
            instance: null
        };
        this.customOptions = customOptions || {};
    }

    /**
     * Returns the response object
     */
    public getResponse(): ResponseInterface | null {
        return this.response;
    }

    /**
     * Sets a response and stops event propagation
     */
    public  setResponse(response: ResponseInterface | null): void {
        this.response = response;
        if (response) {
            this.stopPropagation();
        }
    }

    /**
     * Returns whether a response was set
     */
    public hasResponse(): boolean {
        return this.response !== null;
    }

    /**
     * Returns the event target
     */
    public getEventTarget(): EventTargetRequest {
        return this.eventTarget;
    }

    /**
     * Returns custom options
     */
    public getCustomOptions(): Record<string, any> {
        return this.customOptions;
    }

    /**
     * Returns a custom option value
     */
    public getCustomOption<T = any>(key: string, defaultValue?: T): T | undefined {
        return this.customOptions[key] ?? defaultValue;
    }
}

/**
 * Event dispatched just before making the fetch call
 * Allows modification of fetch options and URL
 */
export class FetchRequestEvent extends RequestEvent {
    private _url: string | URL;
    private _fetchOptions: FetchRequestOptions;
    private readonly resolvePromise: (value: unknown) => void;
    private readonly rejectPromise: (reason?: any) => void;

    constructor(
        request: Request,
        url: string | URL,
        fetchOptions: FetchRequestOptions ,
        resolvePromise: (value: unknown) => void,
        rejectPromise: (reason?: any) => void,
        requestType: RequestType = RequestType.MAIN,
        eventTarget?: EventTargetRequest,
        customOptions?: Record<string, any>
    ) {
        super(request, requestType, eventTarget, customOptions);
        this._url = url;
        this._fetchOptions = { ...fetchOptions };
        this.resolvePromise = resolvePromise;
        this.rejectPromise = rejectPromise;
    }

    /**
     * Returns the URL to fetch
     */
    public getUrl(): string | URL {
        return this._url;
    }

    /**
     * Sets the URL to fetch
     */
    public setUrl(url: string | URL): void {
        this._url = url;
    }

    /**
     * Returns the fetch options
     */
    public getFetchOptions():FetchRequestOptions {
        return this._fetchOptions;
    }

    /**
     * Sets the fetch options
     */
    public setFetchOptions(options: FetchRequestOptions): void {
        this._fetchOptions = { ...options };
    }

    /**
     * Merges fetch options
     */
    public mergeFetchOptions(options: Partial<FetchRequestOptions>): void {
        this._fetchOptions = {
            ...this._fetchOptions,
            ...options,
            headers: {
                ...(this._fetchOptions.headers || {}),
                ...(options.headers || {})
            }
        };
    }

    /**
     * Resolves the fetch promise (for interceptors)
     */
    public resolve(value: unknown): void {
        this.resolvePromise(value);
        this.stopPropagation();
    }

    /**
     * Rejects the fetch promise (for interceptors)
     */
    public reject(reason?: any): void {
        this.rejectPromise(reason);
        this.stopPropagation();
    }
}

/**
 * Event dispatched when an error occurs during the request
 * Allows listeners to handle or transform errors
 */
export class FetchRequestErrorEvent extends RequestEvent {
    private _error: Error;
    private recovered: boolean = false;

    constructor(
        request: Request,
        error: Error,
        requestType: RequestType = RequestType.MAIN,
        eventTarget?: EventTargetRequest,
        customOptions?: Record<string, any>
    ) {
        super(request, requestType, eventTarget, customOptions);
        this._error = error;
    }

    /**
     * Returns the error
     */
    public getError(): Error {
        return this._error;
    }

    /**
     * Sets a new error
     */
    public setError(error: Error): void {
        this._error = error;
    }

    /**
     * Marks the error as recovered by setting a response
     * This will prevent the error from being thrown
     */
    public override setResponse(response: ResponseInterface | null): void {
        if (response) {
            this.recovered = true;
        }
        super.setResponse(response);
    }

    /**
     * Returns whether the error was recovered
     */
    public isRecovered(): boolean {
        return this.recovered;
    }
}

/**
 * Event dispatched when a response is received
 * Allows modification of the response before it's returned
 */
export class FetchResponseEvent extends HttpEvent {
    private fetchResponse: FetchResponseInterface;

    constructor(
        request: Request,
        fetchResponse: FetchResponseInterface,
        requestType: RequestType = RequestType.MAIN,
        private readonly eventTarget?: EventTargetRequest,
        private readonly customOptions?: Record<string, any>
    ) {
        super(request, requestType);
        this.fetchResponse = fetchResponse;
    }

    /**
     * Returns the response
     */
    public getResponse(): FetchResponseInterface {
        return this.fetchResponse;
    }

    /**
     * Sets the response
     */
    public setResponse(response: FetchResponseInterface): void {
        this.fetchResponse = response;
    }

    /**
     * Returns the event target
     */
    public getEventTarget(): EventTargetRequest | undefined {
        return this.eventTarget;
    }

    /**
     * Returns custom options
     */
    public getCustomOptions(): Record<string, any> | undefined {
        return this.customOptions;
    }

    /**
     * Returns a custom option value
     */
    public getCustomOption<T = any>(key: string, defaultValue?: T): T | undefined {
        return this.customOptions?.[key] ?? defaultValue;
    }
}


/**
 * Event dispatched after the response has been sent
 * Useful for cleanup, logging, metrics, etc.
 */
export class TerminateEvent extends HttpEvent {
    constructor(
        request: Request,
        private readonly response: ResponseInterface | null,
        private readonly error: Error | null = null,
        requestType: RequestType = RequestType.MAIN,
        private readonly eventTarget?: EventTargetRequest,
        private readonly customOptions?: Record<string, any>
    ) {
        super(request, requestType);
    }

    /**
     * Returns the response (may be null if an error occurred)
     */
    public getResponse(): ResponseInterface | null {
        return this.response;
    }

    /**
     * Returns the error (if any)
     */
    public getError(): Error | null {
        return this.error;
    }

    /**
     * Returns whether the request was successful
     */
    public isSuccessful(): boolean {
        return this.error === null && this.response !== null;
    }

    /**
     * Returns the event target
     */
    public getEventTarget(): EventTargetRequest | undefined {
        return this.eventTarget;
    }

    /**
     * Returns custom options
     */
    public getCustomOptions(): Record<string, any> | undefined {
        return this.customOptions;
    }
}


