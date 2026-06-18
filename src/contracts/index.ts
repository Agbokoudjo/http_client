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

import { FetchBodyData, FetchRequestOptions } from "../types";

export interface FetchRequestInterface {
    readonly url: string | URL;
    getFetchRequestOptions(): FetchRequestOptions;
    readonly isCancelled: boolean;
    handle(): Promise<FetchResponseInterface>;
    cancel(): void;
}

export interface MapStatusToResponseTypeInterface {

    get statusCode(): number;

    get serverInfo(): boolean;

    get succeeded(): boolean;

    get clientError(): boolean;

    get serverError(): boolean;

    get redirected(): boolean;

    get failed(): boolean;
}

export interface ResponseInterface extends MapStatusToResponseTypeInterface {

    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly headers: Headers;
}

export interface FetchResponseInterface<T extends FetchBodyData=any> extends ResponseInterface {

    get isHTML(): boolean;

    get contentType(): string;

    get headers(): Headers;

    header(name: string): string | null;

    get data(): T;

    setData(_data: T):void;
    
    get originalResponse(): Response;

    setOriginalResponse(_newResponse: Response): void;
}

export interface DelegateRequestInterface {

    prepareRequest(request: FetchRequestInterface): void;

    requestStarted(_request: FetchRequestInterface): void;

    requestFinished(_request: FetchRequestInterface): void;

    requestErrored(request: FetchRequestInterface, error: Error): void;
}

export interface DelegateResponseInterface {

    requestFailedWithResponse(request: FetchRequestInterface, fetchResponse: FetchResponseInterface): void;

    requestSucceededWithResponse(request: FetchRequestInterface, fetchResponse: FetchResponseInterface): void;

    requestPreventedHandlingResponse(request: FetchRequestInterface, fetchResponse: FetchResponseInterface): void;
}

export interface FetchDelegateInterface extends DelegateResponseInterface, DelegateRequestInterface {

}


