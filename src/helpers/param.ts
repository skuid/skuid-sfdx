import { PullQueryParams } from '../types/types';

/**
 * Takes a hash-map of data to transmit
 * and serializes it using mime type "application/x-www-form-urlencoded"
 * @param  {PullQueryParams} map of parameter names to values
 * @return {String} URL-encoded data
 */
function param(data: PullQueryParams): string {
    return Object.entries(data).map(([ key, value ]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

export {
    param
};
