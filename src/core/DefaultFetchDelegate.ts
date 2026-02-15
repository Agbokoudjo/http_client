
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
    FetchDelegateInterface,
    FetchResponseInterface,
} from "../contracts";

export class DefaulFetchDelegate implements FetchDelegateInterface {
    
    public prepareRequest(request: Request): void {
       console.log(request)
    }

    public requestStarted(_request: Request): void {
        console.log(_request)
    }

    public requestSucceededWithResponse(request: Request, fetchResponse: FetchResponseInterface): void {
        console.log(request,fetchResponse)
    }

    public requestPreventedHandlingResponse(request: Request, fetchResponse: FetchResponseInterface): void {
        console.log(request, fetchResponse)
    }

    public requestFailedWithResponse(request: Request, response: FetchResponseInterface) {
        console.log(request, response)
    }
 
    public requestErrored(request: Request, error: Error): void {
        console.log(request,error)
    }

    public requestFinished(_request: Request): void {
        console.log(_request)
    }
}