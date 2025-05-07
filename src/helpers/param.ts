/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { PullQueryParams } from '../types/types';

/**
 * Takes a hash-map of data to transmit
 * and serializes it using mime type "application/x-www-form-urlencoded"
 *
 * @param  {PullQueryParams} map of parameter names to values
 * @return {String} URL-encoded data
 */
function param(data: PullQueryParams): string {
    return Object.entries(data).map(([ key, value ]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

export {
    param
};
