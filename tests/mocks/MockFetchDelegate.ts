import { FetchDelegateInterface } from "../../src";



export class MockFetchDelegate implements FetchDelegateInterface {
    public calls: {
        prepareRequest: Request[];
        requestStarted: Request[];
        requestFinished: Request[];
        requestErrored: Array<{ request: Request; error: Error }>;
        requestFailed: Array<{ request: Request; response: any }>;
        requestSucceeded: Array<{ request: Request; response: any }>;
        requestPrevented: Array<{ request: Request; response: any }>;
    } = {
            prepareRequest: [],
            requestStarted: [],
            requestFinished: [],
            requestErrored: [],
            requestFailed: [],
            requestSucceeded: [],
            requestPrevented: []
        };

    prepareRequest(request: Request): void {
        this.calls.prepareRequest.push(request);
    }

    requestStarted(request: Request): void {
        this.calls.requestStarted.push(request);
    }

    requestFinished(request: Request): void {
        this.calls.requestFinished.push(request);
    }

    requestErrored(request: Request, error: Error): void {
        this.calls.requestErrored.push({ request, error });
    }

    requestFailedWithResponse(request: Request, response: any): void {
        this.calls.requestFailed.push({ request, response });
    }

    requestSucceededWithResponse(request: Request, response: any): void {
        this.calls.requestSucceeded.push({ request, response });
    }

    requestPreventedHandlingResponse(request: Request, response: any): void {
        this.calls.requestPrevented.push({ request, response });
    }

    reset(): void {
        this.calls = {
            prepareRequest: [],
            requestStarted: [],
            requestFinished: [],
            requestErrored: [],
            requestFailed: [],
            requestSucceeded: [],
            requestPrevented: []
        };
    }
}