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
