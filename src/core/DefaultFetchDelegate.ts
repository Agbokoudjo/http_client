
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
//src/core/DefaultFetchDelegate.ts
import {
    FetchDelegateInterface,
    FetchResponseInterface,
    FetchRequestInterface
} from "../contracts";

export class DefaulFetchDelegate implements FetchDelegateInterface {
    
    public prepareRequest(request: FetchRequestInterface): void {
       console.log(request)
    }

    public requestStarted(_request: FetchRequestInterface): void {
        console.log(_request)
    }

    public requestSucceededWithResponse(request: FetchRequestInterface, fetchResponse: FetchResponseInterface): void {
        console.log(request,fetchResponse)
    }

    public requestPreventedHandlingResponse(request: FetchRequestInterface, fetchResponse: FetchResponseInterface): void {
        console.log(request, fetchResponse)
    }

    public requestFailedWithResponse(request: FetchRequestInterface, response: FetchResponseInterface) {
        console.log(request, response)
    }
 
    public requestErrored(request: FetchRequestInterface, error: Error): void {
        console.log(request,error)
    }

    public requestFinished(_request: FetchRequestInterface): void {
        console.log(_request)
    }
}