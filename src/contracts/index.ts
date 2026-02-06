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

import { FetchBodyData} from "../types";

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

    prepareRequest(request: Request): void;

    requestStarted(_request: Request): void;

    requestFinished(_request: Request): void;

    requestErrored(request: Request, error: Error): void;
}

export interface DelegateResponseInterface {

    requestFailedWithResponse(request: Request, fetchResponse: FetchResponseInterface): void;

    requestSucceededWithResponse(request: Request, fetchResponse: FetchResponseInterface): void;

    requestPreventedHandlingResponse(request: Request, fetchResponse: FetchResponseInterface): void;
}

export interface FetchDelegateInterface extends DelegateResponseInterface, DelegateRequestInterface {

}


