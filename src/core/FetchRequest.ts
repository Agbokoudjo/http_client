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
    EventTargetRequest,
    FetchRequestOptions,
    HttpResponseType,
    ResponseTypeMap,
    RequestType
} from "../types";

import {
    FetchResponseInterface,
    FetchDelegateInterface
} from "../contracts";

import {
    isClientError,
    isServerError,
    mapStatusToResponseType
} from "../utils"
 
import {
    parseHttpErrorResponse,
    responseTypeHandle
} from "./FetchResponse";

import {
    EventDispatcherInterface
} from "@wlindabla/event_dispatcher";

import {
    FetchRequestErrorEvent,
    FetchRequestEvent,
     FetchResponseEvent,
     HttpClientEvents,
     TerminateEvent
 } from "../events";
import { DefaulFetchDelegate } from "./DefaultFetchDelegate";

export interface HttpClientInterface {
    handle(): Promise<FetchResponseInterface>;
    cancel(): void;
}

/**
 * Provides flexible methods for requesting HTTP resources synchronously or asynchronously.
 *
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 */
export class FetchRequest extends Request implements HttpClientInterface {
    private _abortController: AbortController | null = null;
    private _isCancelled: boolean = false;
    private _resolveRequestPromise: (value: unknown) => void = () => { };
    private _rejectRequestPromise: (reason?: any) => void = () => { };
    private _input: string | URL;

    public constructor(
        private readonly fetchDelegate: FetchDelegateInterface=new DefaulFetchDelegate(),
        private readonly eventDispatcher: EventDispatcherInterface,
        private _fetchRequestOptions: FetchRequestOptions,
        private readonly requestType: RequestType = RequestType.MAIN,
        private readonly eventTarget?: EventTargetRequest
    ) {
        super(_fetchRequestOptions.url, _fetchRequestOptions);
        
        this._input = this._fetchRequestOptions.url;
        this._abortController = new AbortController();
    }


    async handle(): Promise<FetchResponseInterface> {
        if (this._isCancelled) {
            throw new HttpFetchError("Request was cancelled", this._input);
        }

        this.fetchDelegate.prepareRequest(this);

        const requestEvent = await this.dispatchRequestEvent(); // Phase 1: REQUEST - Permet l'interception avant l'envoi

        let fetchResponse: FetchResponseInterface;
        let error: Error | null = null;

        try {
            this.fetchDelegate.requestStarted(this);

            if (requestEvent.hasResponse()) { // Si un listener a déjà fourni une réponse, on ne fait pas la requête
                fetchResponse = requestEvent.getResponse() as FetchResponseInterface;
            } else {
                const beforeSendEvent = await this.dispatchBeforeSendEvent();  // Phase 2: BEFORE_SEND - Dernière chance de modifier la requête

                if (beforeSendEvent.hasResponse()) {
                    fetchResponse = beforeSendEvent.getResponse() as FetchResponseInterface;
                } else {
                    // Ajout du signal d'annulation
                    if (this._abortController) {
                        this._fetchRequestOptions.signal = this._abortController.signal;
                    }

                    fetchResponse = await safeFetch(this._fetchRequestOptions);
                }
            }

            fetchResponse = await this.dispatchResponseEvent(fetchResponse); // Phase 3: RESPONSE - Traitement de la réponse

            return fetchResponse;

        } catch (err) {
            error = err as Error;
            const errorEvent = await this.dispatchErrorEvent(error);  // Phase 4: ERROR - Gestion des erreurs

            if (errorEvent.isRecovered() && errorEvent.hasResponse()) {
                fetchResponse = errorEvent.getResponse() as FetchResponseInterface;
                error = null;
            } else {
                if (this.willDelegateErrorHandling(error)) {
                    this.fetchDelegate.requestErrored(this, error);
                }
                throw error;
            }

            return fetchResponse!;

        } finally {
            this.dispatchTerminateEvent(fetchResponse!, error);  // Phase 5: TERMINATE - Toujours appelé
            this.fetchDelegate.requestFinished(this);
        }
    }
    
    public set fetchRequestOptions(_fetchRequestOptions:FetchRequestOptions){
        this._fetchRequestOptions = _fetchRequestOptions;
    }

    public set data(_data:unknown){
        this._fetchRequestOptions.data = _data;
    }

    /**
      * Phase 1: REQUEST Event
      */
    private async dispatchRequestEvent(): Promise<FetchRequestEvent> {
        const requestInterception = new Promise((resolve, reject) => {
            this._resolveRequestPromise = resolve;
            this._rejectRequestPromise = reject;
        });

        const event = this.eventDispatcher.dispatch(
            new FetchRequestEvent(
                this,
                this._input,
                this._fetchRequestOptions,
                this._resolveRequestPromise,
                this._rejectRequestPromise,
                this.requestType,
                this.eventTarget,
                {
                    cancelable: true
                }
            ),
            HttpClientEvents.REQUEST
        ) as FetchRequestEvent;

        this._input = event.getUrl();

        // Si preventDefault() a été appelé, attendre la résolution manuelle
        if (event.isDefaultPrevented()) {
            await requestInterception;
        }

        return event;
    }

    /**
     * Phase 2: BEFORE_SEND Event
     */
    private async dispatchBeforeSendEvent(): Promise<FetchRequestEvent> {
        const event = this.eventDispatcher.dispatch(
            new FetchRequestEvent(
                this,
                this._input,
                this._fetchRequestOptions,
                this._resolveRequestPromise,
                this._rejectRequestPromise,
                this.requestType,
                this.eventTarget,
                {
                    cancelable: true
                }
            ),
            HttpClientEvents.BEFORE_SEND
        ) as FetchRequestEvent;

        this._fetchRequestOptions = {
            ...this._fetchRequestOptions,
            ...event.getFetchOptions()
        };

        return event;
    }

    /**
     * Phase 3: RESPONSE Event
     */
    private async dispatchResponseEvent(
        fetchResponse: FetchResponseInterface
    ): Promise<FetchResponseInterface> {
        const event = this.eventDispatcher.dispatch(
            new FetchResponseEvent(
                this,
                fetchResponse,
                this.requestType,
                this.eventTarget,
                {
                    cancelable: true,
                    bubbles: true
                }
            ),
            HttpClientEvents.RESPONSE
        ) as FetchResponseEvent;

        // Vérifier si event.preventDefault() a été appelé
        if (event.isDefaultPrevented()) {
            this.fetchDelegate.requestPreventedHandlingResponse(this, event.getResponse());
        } else if (fetchResponse.succeeded || fetchResponse.serverInfo) {
            this.fetchDelegate.requestSucceededWithResponse(this, event.getResponse());
        } else {
            this.fetchDelegate.requestFailedWithResponse(this, event.getResponse());
        }

        return event.getResponse();
    }

    /**
     * Phase 4: ERROR Event
     */
    private async dispatchErrorEvent(error: Error): Promise<FetchRequestErrorEvent> {
        const event = this.eventDispatcher.dispatch(
            new FetchRequestErrorEvent(
                this,
                error,
                this.requestType,
                this.eventTarget,
                { cancelable: true }
            ),
            HttpClientEvents.ERROR
        ) as FetchRequestErrorEvent;

        return event;
    }

    /**
     * Phase 5: TERMINATE Event
     */
    private dispatchTerminateEvent(
        response: FetchResponseInterface | null,
        error: Error | null
    ): void {
        this.eventDispatcher.dispatch(
            new TerminateEvent(
                this,
                response,
                error,
                this.requestType,
                this.eventTarget
            ),
            HttpClientEvents.TERMINATE
        );
    }


    /**
     * Détermine si l'erreur doit être déléguée
     */
    private willDelegateErrorHandling(error: Error): boolean {
        // On ne délègue pas si preventDefault() a été appelé sur l'événement d'erreur
        const errorEvent = new FetchRequestErrorEvent(
            this,
            error,
            this.requestType,
            this.eventTarget,
            { cancelable: true }
        );

        this.eventDispatcher.dispatch(errorEvent, HttpClientEvents.ERROR);

        return !errorEvent.isDefaultPrevented();
    }

    /**
     * Annule la requête en cours
     */
    public cancel(): void {
        if (!this._isCancelled && this._abortController) {
            this._isCancelled = true;
            this._abortController.abort();
            this._rejectRequestPromise(new HttpFetchError("Request was cancelled by user", this._input));
        }
    }

    /**
     * Vérifie si la requête a été annulée
     */
    public isCancelled(): boolean {
        return this._isCancelled;
    }
}



/**
 *
### **httpFetchHandler Function**
The `httpFetchHandler` function is an asynchronous utility for making HTTP requests with built-in timeout handling, retry attempts, and automatic response parsing.

### **Parameters**
| Parameter       | Type                                  | Default Value    | Description |
|----------------|--------------------------------------|-----------------|-------------|
| `url`          | `string | URL`                      | **Required**     | The API endpoint to send the request to. |
| `methodSend`   | `string`                             | `"GET"`          | The HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.). |
| `data`         | `any`                                | `null`           | The data to send in the request body (supports JSON and FormData). |
| `optionsheaders` | `HeadersInit`                     | `{ 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }` | Custom headers for the request. |
| `timeout`      | `number`                             | `5000` (5 sec)   | The maximum time (in milliseconds) before the request is aborted. |
| `retryCount`   | `number`                             | `3`              | Number of times to retry the request if it fails. |
| `responseType` | `'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream'` | `'json'`          | The expected response format. |

### **Return Value**
The function returns a `Promise` that resolves to the requested data in the specified `responseType`.

### **Function Workflow**
1. **FormData Handling**  
 - If `data` is an instance of `FormData`, it automatically manages headers.
 - The `"Content-Type"` header is **removed** to let the browser set it correctly.

2. **Headers Handling**  
 - If the headers are a `HeadersInit` object, they are converted to a mutable object using:  
   ```ts
   Object.fromEntries(new Headers(optionsheaders).entries());
   ```
 - This avoids `TypeScript` errors when modifying headers.

3. **Data Handling with `JSON.stringify`**  
 - When sending `JSON` data, the function **automatically converts it** using `JSON.stringify(data)`.  
 - **Important:** Do not manually stringify the data before passing it, to avoid double encoding.  
 - Example:  
   ```ts
   httpFetchHandler({ url: "/api", methodSend: "POST", data: { name: "John" } });
   ```
   ✅ The function internally does:  
   ```ts
   JSON.stringify({ name: "John" });
   ```

4. **Request Timeout Handling**  
 - Uses `AbortController` to automatically cancel requests after `timeout` milliseconds.

5. **Retry Mechanism**  
 - If the request fails, the function retries up to `retryCount` times before throwing an error.

### **Example Usage**
```ts
const response = await httpFetchHandler({
url: "https://api.example.com/data",
methodSend: "POST",
data: { username: "Alice" },
responseType: "json"
});

console.log(response); // Parsed JSON response
```

---
 */
export async function safeFetch<K extends HttpResponseType = "json">(
    fetchRequestOptions: FetchRequestOptions
): Promise<FetchResponseInterface<ResponseTypeMap[K]>> {

    let {
        url,
        methodSend = "GET",
        data = null,
        headers = {
            'Accept': "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
        timeout = 45000,
        retryCount = 3,
        responseType = 'json' as K,
        retryOnStatusCode = false,
        keepalive = false
    } = fetchRequestOptions;

    const isFormData = data instanceof FormData;
    const headers_request: HeadersInit = { ...headers };

    if (isFormData && headers_request instanceof Object) {
        delete (headers_request as Record<string, string>)["Content-Type"];
    }

    if (keepalive) {
        retryCount = 1;
        timeout = 0;
    } else if (retryCount <2 && fetchRequestOptions.retryCount !== undefined) {
        retryCount = 3;
    }

    const fetchParams: RequestInit = {
        ...fetchRequestOptions,
        method: methodSend,
        headers: headers_request,
        keepalive,
    };

    if (data && ["POST", "PUT", "PATCH"].includes(methodSend)) {
        fetchParams.body = isFormData ? data : JSON.stringify(data);
    }

    for (let attempt = 0; attempt < retryCount; ++attempt) {
        const controller = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        if (!keepalive && timeout > 0) {
            timeoutId = setTimeout(() => controller.abort(), timeout);
            fetchParams.signal = controller.signal;
        }

        try {
            const response = await fetch(url, fetchParams);

            if (timeoutId) clearTimeout(timeoutId);

            const statusCode = response.status;
            const isErrror = mapStatusToResponseType(statusCode) === "error"

            if (isErrror) {
                console.warn(`Response status=${statusCode} (attempt ${attempt + 1}/${retryCount})`);

                if (isClientError(statusCode)
                    || (isServerError(statusCode) && !retryOnStatusCode)
                    || attempt === retryCount - 1) {
                    return await parseHttpErrorResponse(response);
                }

                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));

                continue;
            }

            console.info(`Successful response (status ${statusCode}) on attempt ${attempt + 1}`);

            return await responseTypeHandle(responseType, response) as FetchResponseInterface<ResponseTypeMap[K]>;

        } catch (error: any) {

            if (timeoutId) clearTimeout(timeoutId);

            const isLastAttempt = attempt === retryCount - 1;

            if (error.name === "AbortError") {
                console.warn(`Timeout (attempt ${attempt + 1}/${retryCount})`);

                if (isLastAttempt) {

                    throw new HttpFetchError(
                        "Request timed out because the server did not respond within the specified time.",
                        url,
                        { cause: error }
                    );
                }

            } else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {

                console.warn(`Network error: ${error.message} (attempt ${attempt + 1}/${retryCount})`);

                if (isLastAttempt) {
                    throw new HttpFetchError(
                        `Network error after ${retryCount} attempts: ${error.message}`,
                        url,
                        { cause: error }
                    );
                }

                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));

                continue;
            }

            else {
                console.error(`Unexpected error: ${error.message} (attempt ${attempt + 1}/${retryCount})`);

                if (isLastAttempt) {
                    throw new HttpFetchError(
                        `Unexpected error after ${retryCount} attempts: ${error.message}`,
                        url,
                        { cause: error }
                    );
                }

                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));

                continue;
            }
        }
    }

    throw new HttpFetchError("Unexpected fallthrough in httpFetchHandler", url);
}

interface HttpFetchErrorOptions {
    attempt?: number;
    responseStatus?: number;
    responseBody?: any;
    cause?: unknown;
}

export class HttpFetchError extends Error {
    private __url: string | URL | Request;
    public readonly attempt?: number;
    public readonly responseStatus?: number;
    public readonly responseBody?: any;
    
    constructor(message: string, url: string | URL | Request, options?: HttpFetchErrorOptions) {
        super(message);
        this.name = 'HttpFetchError';
        this.__url = url;
        this.attempt = options?.attempt;
        this.responseStatus = options?.responseStatus;
        this.responseBody = options?.responseBody;
        this.cause = options?.cause;
        Object.setPrototypeOf(this, HttpFetchError.prototype);
    }

    public get url(): string | URL | Request { return this.__url; }
}
