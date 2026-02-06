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

export function isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500;
}

export function isServerError(statusCode: number): boolean {
    return statusCode >= 500 && statusCode < 600;
}

export function isHTMLResponse(contentTypeResponse: string = ""): boolean {
    return contentTypeResponse !== ""
        && contentTypeResponse.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/) !== null
}

export type MappedHttpStatus = 'success' | 'info' | 'warning' | 'error' | 'redirect';

export function mapStatusToResponseType(statusCode: number): MappedHttpStatus {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 100 && statusCode < 200) return 'info';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    return 'error';
}