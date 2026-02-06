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
import type {
    FetchResponseInterface,
    MapStatusToResponseTypeInterface
} from "../contracts";
import {
    FetchBodyData,
    ResponseTypeMap,
    HttpResponseType
} from "../types";

import {
    isClientError,
    isServerError,
    isHTMLResponse
} from "../utils";

export abstract class MapStatusToResponseType implements MapStatusToResponseTypeInterface {
    protected constructor(protected readonly response: Response) { }

    get statusCode(): number {
        return this.response.status
    }

    get serverInfo(): boolean {
        return this.statusCode < 200
    }

    get succeeded(): boolean {
        return this.statusCode >= 200 && this.statusCode <= 299;
    }

    get clientError(): boolean {
        return isClientError(this.statusCode);
    }

    get serverError(): boolean {
        return isServerError(this.statusCode);
    }

    get redirected(): boolean {
        return this.response.redirected;
    } 

    get failed(): boolean {
        return !this.succeeded && !this.redirected && !this.serverInfo;
    }
}


export abstract class FetchResponse<T extends FetchBodyData = unknown> extends MapStatusToResponseType implements FetchResponseInterface {
    protected constructor(private  _response: Response) {
        super(_response);
    }

     public get originalResponse():Response{
        return this._response ;
     }

     get statusText(): string {
        return this._response.statusText;
    }

    get ok(): boolean {
        return this._response.ok;
    }

    get isHTML(): boolean {
        return isHTMLResponse(this.contentType);
    }

    get contentType(): string {
        return this.header("Content-Type") || "";
    }

    get headers(): Headers { return this.response.headers; }

    public header(name: string): string | null { return this.headers.get(name); }

    abstract get data(): T;

    abstract setData(_data:T):void;

    get status(): number { return this.statusCode; }

    setOriginalResponse(_newResponse:Response):void{
        this._response=_newResponse;
     }
    
}

export class HttpResponse<T extends FetchBodyData = unknown> extends FetchResponse {

    constructor(_response: Response, private _data: T) { super(_response); }

    get data(): T { return this._data ; }
    
    setData(_data:T):void{
        this._data=_data ;
    }
}

/**
 * Handles different response types and returns properly typed HttpResponse
 * 
 * @template K - The response type key (json, text, blob, etc.)
 * @param responseType - The expected response format
 * @param response - The fetch Response object
 * @returns Promise resolving to typed HttpResponse
 * 
 * @example
 * ```typescript
 * // Blob response
 * const blobResult = await responseTypeHandle("blob", response);
 * blobResult.data // Type: Blob
 * 
 * // JSON response
 * const jsonResult = await responseTypeHandle("json", response);
 * jsonResult.data // Type: unknown (cast as needed)
 * ```
 */
export async function responseTypeHandle<K extends HttpResponseType="json">(
    responseType: K,
    response: Response
): Promise<FetchResponseInterface<ResponseTypeMap[K]>> {

    switch (responseType) {
        case "json":
            return new HttpResponse(response, await response.json()) as HttpResponse<ResponseTypeMap[K]>;

        case "text":
            return new HttpResponse(response, await response.text()) as HttpResponse<ResponseTypeMap[K]>;

        case "blob":
            return new HttpResponse(response, await response.blob()) as HttpResponse<ResponseTypeMap[K]>;

        case "arrayBuffer":
            return new HttpResponse(response, await response.arrayBuffer()) as HttpResponse<ResponseTypeMap[K]>;

        case "formData":
            return new HttpResponse(response, await response.formData()) as HttpResponse<ResponseTypeMap[K]>;

        case "stream":
            return new HttpResponse(response, response.body) as HttpResponse<ResponseTypeMap[K]>;

        default:
            console.error(`Response type '${responseType}' is not supported`);
            return new HttpResponse(response, response.statusText) as HttpResponse<ResponseTypeMap[K]>;
    }
}

/**
 * Detects and parses error responses based on Content-Type header
 * 
 * @template K - The detected response type
 * @param response - The fetch Response object with error status
 * @returns Promise resolving to typed HttpResponse
 */
export async function parseHttpErrorResponse<K extends HttpResponseType = "text">(
    response: Response
): Promise<FetchResponseInterface<ResponseTypeMap[K]>> {

    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return new HttpResponse<K>(response, '' as K) as HttpResponse<ResponseTypeMap[K]>;
    }

    const contentType = (response.headers.get("content-type") ?? "").trim().toLowerCase();

    if (["application/json",
        "application/ld+json",
        "application/problem+json",
        "application/vnd.api+json"].some((type) => contentType.startsWith(type))
        || contentType.includes("json")
        || contentType.endsWith("+json")) {

        return await responseTypeHandle("json" as K, response);
    }

    if (isHTMLResponse(contentType)) {
        return await responseTypeHandle("text" as K, response);
    }

    if (
        contentType.startsWith("application/xml") ||
        contentType.startsWith("text/xml") ||
        contentType.includes("xml")
    ) {
        return await responseTypeHandle("text" as K, response);
    }

    try {
        return new HttpResponse(response, response.statusText) as HttpResponse<ResponseTypeMap[K]>;
    } catch {
        return new HttpResponse(response, response.statusText) as HttpResponse<ResponseTypeMap[K]>;
    }
}

