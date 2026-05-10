//src/core/index.ts
export {
    FetchResponse,
    MapStatusToResponseType,
    HttpResponse,
    parseHttpErrorResponse,
    responseTypeHandle,
} from "./FetchResponse";
export {
    FetchRequest,
    HttpFetchError,
    safeFetch
} from "./FetchRequest";

export type {
    FetchErrorTranslatorConfig,
    FetchErrorTranslatorInterface
} from "./FetchErrorTranslator";

export {
    FetchErrorTranslator
} from "./FetchErrorTranslator";