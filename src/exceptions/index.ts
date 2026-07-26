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

// src/exceptions/BadResponseHttp.ts

/**
 * Represents the serialized form of a {@link BadResponseHttp} exception,
 * suitable for logging, JSON transport, or structured error reporting.
 */
export interface BadResponseHttpContext {
    /** The exception class name. Always `"BadResponseHttp"`. */
    readonly name: string;

    /** The human-readable error message. */
    readonly message: string;

    /**
     * The runtime type of the value that was actually received
     * instead of a valid `FetchResponseInterface` instance.
     *
     * Computed via `typeof receivedValue`.
     */
    readonly receivedType: string;

    /**
     * A string representation of the received value.
     *
     * Built with `String(receivedValue)` so it is always safe to display,
     * even when the value is `null`, `undefined`, or a non-serializable object.
     */
    readonly receivedValue: string;

    /**
     * The HTTP status code extracted from the received value,
     * when it exposes a `statusCode` or `status` numeric property.
     *
     * `null` when the received value does not carry an HTTP status.
     */
    readonly statusCode: number | null;

    /**
     * The ISO-8601 timestamp at which the exception was instantiated.
     *
     * @example "2025-05-03T10:42:00.000Z"
     */
    readonly thrownAt: string;

    /**
     * The stack trace string, if available in the current environment.
     * `undefined` in environments where `Error.stack` is not supported.
     */
    readonly stack?: string;
}

/**
 * Exception thrown when the value returned by `FetchRequest.handle()` is not
 * a valid `FetchResponseInterface` instance (i.e. not an `HttpResponse` object).
 *
 * ---
 *
 * ### Why this exception exists
 *
 * `FetchRequest.handle()` is typed to return a `FetchResponseInterface`, but at
 * runtime an unexpected value (e.g. `null`, `undefined`, a plain object, or a raw
 * `Response`) could slip through. `BadResponseHttp` provides a clear, structured
 * error in that case, rather than a cryptic downstream `TypeError`.
 *
 * ---
 *
 * ### Usage
 *
 * ```typescript
 * import { HttpResponse } from '../core/FetchResponse';
 * import { BadResponseHttp } from '../exceptions/BadResponseHttp';
 *
 * const fetchResponse = event.resultHttpResponse?.fetchResponse;
 *
 * if (!(fetchResponse instanceof HttpResponse)) {
 *   throw new BadResponseHttp(
 *     'Expected a FetchResponseInterface instance from FetchRequest.handle()',
 *     fetchResponse,
 *   );
 * }
 * ```
 *
 * ---
 *
 * ### Catching and inspecting
 *
 * ```typescript
 * try {
 *   // … code that may throw
 * } catch (error) {
 *   if (error instanceof BadResponseHttp) {
 *     console.error(error.message);
 *     console.error('Received type :', error.receivedType);
 *     console.error('Received value:', error.receivedValue);
 *     console.error('Status code  :', error.statusCode);
 *     console.error('Context      :', error.toJSON());
 *   }
 * }
 * ```
 *
 * @extends Error
 */
export class BadResponseHttp extends Error {

    /** Always `"BadResponseHttp"` — used for `instanceof`-safe type narrowing in catch blocks. */
    public override readonly name: string = 'BadResponseHttp';

    /**
     * The runtime type of the value that was actually received,
     * as returned by `typeof receivedValue`.
     *
     * @example "object" | "undefined" | "string"
     */
    public readonly receivedType: string;

    /**
     * A safe string representation of the received value,
     * produced by `String(receivedValue)`.
     *
     * Never throws, even for `null`, `undefined`, or circular objects.
     */
    public readonly receivedValue: string;

    /**
     * The HTTP status code extracted from the received value when it exposes
     * a `statusCode` or `status` numeric property (e.g. a raw `Response` or
     * a partially constructed `HttpResponse`).
     *
     * `null` when no numeric status is available on the received value.
     */
    public readonly statusCode: number | null;

    /**
     * The ISO-8601 timestamp at which this exception was instantiated.
     *
     * Useful for correlating exceptions across distributed logs.
     *
     * @example "2025-05-03T10:42:00.000Z"
     */
    public readonly thrownAt: string;

    /**
     * Creates a new `BadResponseHttp` exception.
     *
     * @param message      - A developer-facing description of what went wrong.
     *                       Should explain what was expected and in which context.
     * @param receivedValue - The actual value that was received instead of a
     *                        valid `FetchResponseInterface` instance. Accepts
     *                        `unknown` so callers never need to cast.
     *
     * @example
     * ```typescript
     * throw new BadResponseHttp(
     *   'Expected a FetchResponseInterface instance from FetchRequest.handle()',
     *   fetchResponse,
     * );
     * ```
     */
    public constructor(message: string ="Expected a FetchResponseInterface instance from FetchRequest.handle()", 
        receivedValue: unknown) {
        super(message);

        // Restore the prototype chain broken by extending built-in Error in ES5 targets.
        Object.setPrototypeOf(this, new.target.prototype);

        this.receivedType = typeof receivedValue;
        this.receivedValue = BadResponseHttp.safeStringify(receivedValue);
        this.statusCode = BadResponseHttp.extractStatusCode(receivedValue);
        this.thrownAt = new Date().toISOString();

        // Capture a clean stack trace pointing to the throw site, not this constructor.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BadResponseHttp);
        }
    }

    /**
     * Converts any value to a safe string representation without throwing.
     *
     * - `null` → `"null"`
     * - `undefined` → `"undefined"`
     * - Objects → `JSON.stringify` with a fallback to `Object.prototype.toString`
     *   when the object is circular or non-serializable.
     * - Primitives → `String(value)`
     *
     * @param value - Any value to stringify.
     * @returns A non-throwing string representation.
     */
    private static safeStringify(value: unknown): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return Object.prototype.toString.call(value);
            }
        }

        return String(value);
    }

    /**
     * Extracts a numeric HTTP status code from the received value when possible.
     *
     * Checks both `statusCode` (used by `FetchResponseInterface`) and `status`
     * (used by the native `Response` API) so the exception is informative even
     * when a raw `Response` or a partially constructed object is passed.
     *
     * @param value - The received value to inspect.
     * @returns The numeric status code, or `null` if none is found.
     */
    private static extractStatusCode(value: unknown): number | null {
        if (value === null || value === undefined || typeof value !== 'object') {
            return null;
        }

        const candidate = value as Record<string, unknown>;

        if (typeof candidate['statusCode'] === 'number') {
            return candidate['statusCode'];
        }

        if (typeof candidate['status'] === 'number') {
            return candidate['status'];
        }

        return null;
    }

    /**
     * Serializes the exception into a plain, JSON-safe object.
     *
     * Useful for structured logging (e.g. Sentry, Datadog, console.error)
     * or sending the error context over the wire.
     *
     * @returns A {@link BadResponseHttpContext} snapshot of this exception.
     *
     * @example
     * ```typescript
     * catch (error) {
     *   if (error instanceof BadResponseHttp) {
     *     logger.error(error.toJSON());
     *   }
     * }
     * ```
     */
    public toJSON(): BadResponseHttpContext {
        return {
            name: this.name,
            message: this.message,
            receivedType: this.receivedType,
            receivedValue: this.receivedValue,
            statusCode: this.statusCode,
            thrownAt: this.thrownAt,
            stack: this.stack,
        };
    }

    /**
     * Returns a formatted multi-line string representation of the exception,
     * suitable for console output or plain-text logs.
     *
     * @returns A human-readable summary of the exception context.
     *
     * @example
     * ```
     * [BadResponseHttp] Expected a FetchResponseInterface instance
     *   Received type : object
     *   Received value: {"status":500}
     *   Status code   : 500
     *   Thrown at     : 2025-05-03T10:42:00.000Z
     * ```
     */
    public override toString(): string {
        return [
            `[${this.name}] ${this.message}`,
            `  Received type : ${this.receivedType}`,
            `  Received value: ${this.receivedValue}`,
            `  Status code   : ${this.statusCode ?? 'N/A'}`,
            `  Thrown at     : ${this.thrownAt}`,
        ].join('\n');
    }
}


// src/exceptions/HttpRedirectResponseError.ts

export interface HttpRedirectResponseErrorContext {
    readonly name: string;
    readonly message: string;
    readonly statusCode: number;
    /** true when the request was auto-followed (redirect: 'follow', the default) */
    readonly wasAutoFollowed: boolean;
    /** the final URL after the redirect (only reliable when wasAutoFollowed=true, same-origin) */
    readonly finalUrl: string | null;
    /** the Location header (only readable with redirect:'manual' and a non-opaque response) */
    readonly location: string | null;
    readonly contentType: string;
    readonly expectedResponseType: string;
    readonly thrownAt: string;
    readonly stack?: string;
}

/**
 * Thrown when a request that expected a structured payload (json, formData, …)
 * instead landed on a redirect — either:
 *
 *  - a *raw* 301/302/303/307/308 status (only observable with `redirect: 'manual'`
 *    on Node.js, or in browsers when the redirect is opaque), or
 *  - the browser silently followed the redirect (`redirect: 'follow'`, the default)
 *    and the final response body doesn't match the expected `responseType`.
 *
 * The library does **not** assume where the redirect goes — it could be a login
 * page (expired session/token), a maintenance page, a consent/paywall screen, an
 * A/B-test routing rule, or anything else the server decides. `finalUrl`,
 * `location`, and `contentType` expose exactly where you ended up so *you*
 * decide what to do with it. `looksLikeAuthRedirect()` is just one convenience
 * heuristic for the common "expired session → login page" case — for any other
 * destination, inspect `error.finalUrl` / `error.location` yourself.
 *
 * @example
 * ```typescript
 * try {
 *   const res = await safeFetch({ url: '/api/me', responseType: 'json' });
 * } catch (error) {
 *   if (error instanceof HttpRedirectResponseError) {
 *     if (error.looksLikeAuthRedirect()) {
 *       window.location.href = '/login';
 *     } else {
 *         window.location.href=error.targetRedirectUrl
 *       // any other destination — decide based on what you actually got
 *       console.warn('Unexpected redirect to', error.finalUrl ?? error.location);
 *     }
 *   }
 * }
 * ```
 */
export class HttpRedirectResponseError extends Error {
    public override readonly name: string = 'HttpRedirectResponseError';
    public readonly statusCode: number;
    public readonly wasAutoFollowed: boolean;
    public readonly finalUrl: string | null;
    public readonly location: string | null;
    public readonly contentType: string;
    public readonly expectedResponseType: string;
    public readonly thrownAt: string;

    public constructor(
        message: string,
        options: {
            statusCode: number;
            wasAutoFollowed: boolean;
            finalUrl?: string | null;
            location?: string | null;
            contentType?: string;
            expectedResponseType: string;
        }
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.statusCode = options.statusCode;
        this.wasAutoFollowed = options.wasAutoFollowed;
        this.finalUrl = options.finalUrl ?? null;
        this.location = options.location ?? null;
        this.contentType = options.contentType ?? '';
        this.expectedResponseType = options.expectedResponseType;
        this.thrownAt = new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpRedirectResponseError);
        }
    }

    /**
     * Heuristic for ONE common case: does this redirect look like a
     * session/token-expiry bounce to a login page? This is a convenience
     * shortcut, not an exhaustive classification — the redirect could just as
     * well point to a maintenance page, a consent screen, a paywall, etc.
     * For anything other than the login case, check `finalUrl` / `location`
     * / `contentType` yourself.
     */
    public looksLikeAuthRedirect(): boolean {
        const target = this.targetRedirectUrl.toLowerCase();
        return /login|signin|sign-in|auth|session-expired|connexion/.test(target)
            || this.statusCode === 401
            || this.statusCode === 403;
    }

    public toJSON(): HttpRedirectResponseErrorContext {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            wasAutoFollowed: this.wasAutoFollowed,
            finalUrl: this.finalUrl,
            location: this.location,
            contentType: this.contentType,
            expectedResponseType: this.expectedResponseType,
            thrownAt: this.thrownAt,
            stack: this.stack,
        };
    }

    public get targetRedirectUrl():string{
        return this.finalUrl ?? this.location ?? ''
    }

    public override toString(): string {
        return [
            `[${this.name}] ${this.message}`,
            `  Status code   : ${this.statusCode}`,
            `  Auto-followed : ${this.wasAutoFollowed}`,
            `  Final URL     : ${this.finalUrl ?? 'N/A'}`,
            `  Location      : ${this.location ?? 'N/A'}`,
            `  Content-Type  : ${this.contentType || 'N/A'}`,
            `  Expected type : ${this.expectedResponseType}`,
            `  Thrown at     : ${this.thrownAt}`,
        ].join('\n');
    }
}