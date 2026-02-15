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

import { EventEmitter } from "events";

/**
 * Mapping between response type strings and their corresponding TypeScript types
 */
export type ResponseTypeMap = {
    json: unknown;
    text: string;
    blob: Blob;
    arrayBuffer: ArrayBuffer;
    formData: FormData;
    stream: ReadableStream<Uint8Array> | null;
};

//Allowed HTTP methods
export type HttpMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'HEAD'
    | 'DELETE'
    | 'PURGE'
    | 'OPTIONS'
    | 'TRACE'
    | 'CONNECT'
    | 'QUERY'
    ;

/**
 * Valid response type keys
 */
export type HttpResponseType = keyof ResponseTypeMap;

export type FetchBodyData =
    unknown
    | string
    | Blob
    | ArrayBufferView
    | ArrayBuffer
    | FormData
    | URLSearchParams
    | ReadableStream<Uint8Array>
    | Record<string, any> // Pour les objets JSON
    | null;


export interface FetchRequestOptions<T extends FetchBodyData = any> extends RequestInit {
    url: string | URL; 

    methodSend?: HttpMethod;

    data?: T;  

    timeout?: number;  

    // Number of retry attempts on network failure or timeout
    retryCount?: number;

    // Expected response type to automatically handle parsing
    responseType?: HttpResponseType;

    retryOnStatusCode?: boolean; // Whether to retry the request for certain HTTP status codes (e.g., 5xx)    

    requestType?: RequestType;
    eventTarget?: EventTargetRequest;
    customOptions?: Record<string, any>;
}

export type HttpResponseTypeCase = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'stream' | 'formData';

/**
 * Request types - similar to Symfony's RequestType
 */
export enum RequestType {
    /**
     * A main request (initial HTTP request)
     */
    MAIN = 1,

    /**
     * A sub request (internal request, like ESI)
     */
    SUB = 2
}

/**
 * Event target types
 */
export enum EventTargetType {
    WINDOW = 'window',
    DOCUMENT = 'document',
    EVENT_EMITTER = 'event_emitter',
    HTML_ELEMENT = 'html_element',
    WORKER = 'worker',
    UNKNOWN = 'unknown'
}


/**
 * Represents the target that dispatches events
 */
export interface EventTargetRequest {
    type: EventTargetType;
    instance: Window | Document | HTMLElement | EventTarget | EventEmitter| null;
}


/**
 * Translation messages structure
 * Maps translation keys to their localized strings
 * 
 * @example
 * ```typescript
 * const messages: TranslationMessages = {
 *     'LABEL_BTN_CONFIRM': 'Confirm',
 *     'LABEL_BTN_CANCEL': 'Cancel',
 *     'ACTION_PENDING_TITLE': 'Processing...'
 * };
 * ```
 */
export type TranslationMessages = Record<string, string>;

/**
 * Language-specific translation structure
 * Maps language codes to their translation messages
 * 
 * @example
 * ```typescript
 * const translations: LanguageTranslations = {
 *     en: {
 *         'AbortError': 'Request timed out',
 *         'TypeError': 'Network error'
 *     },
 *     fr: {
 *         'AbortError': 'La requête a expiré',
 *         'TypeError': 'Erreur réseau'
 *     }
 * };
 * ```
 */
export type LanguageTranslations = Record<string, TranslationMessages>;

/**
 * Error translations structure
 * Maps language codes to error name/message pairs
 * 
 * @example
 * ```typescript
 * const translations: ErrorTranslations = {
 *     en: {
 *         'AbortError': 'Request timed out',
 *         'NetworkError': 'Network error occurred'
 *     },
 *     fr: {
 *         'AbortError': 'La requête a expiré',
 *         'NetworkError': 'Erreur réseau'
 *     }
 * };
 * ```
 */
export type ErrorTranslations = Record<string, TranslationMessages>;

/**
 * Pattern matching configuration
 */
export interface ErrorPattern {
    /** Keywords to match in error message */
    keywords: string[];
    /** Error key to use when matched */
    errorKey: string;
}

