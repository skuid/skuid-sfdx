/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// Importing vkbeautify with explicit type annotations
import { xml, xmlmin } from 'vkbeautify';

// Explicitly define types for vkbeautify functions
type VkBeautifyXml = (xmlString: string, indent: string) => string;
type VkBeautifyXmlmin = (prettyXml: string) => string;
const typedXml: VkBeautifyXml = xml as VkBeautifyXml;
const typedXmlmin: VkBeautifyXmlmin = xmlmin as VkBeautifyXmlmin;

/**
 * Pretty-prints a string of XML, adding indentation and newlines between tags
 *
 * @returns {String}
 */
function formatXml(condensedXml: string): string {
    // However, allow for this to be configurable via an environment variable.
    const indent = process.env.SKUID_XML_INDENT ?? '\t';
    return typedXml(condensedXml, indent);
}

/**
 * Minifies a string of XML by removing all whitespace between XML tags.
 * Whitespace within tags should be preserved.
 *
 * @param prettyXml {String} Skuid Page XML
 * @returns {String}
 */
function condenseXml(prettyXml: string): string {
    return typedXmlmin(prettyXml);
}

// The document root element of a Skuid Page, which differs by page generation:
//   <skuidpage>   v1 pages
//   <skuid__page> v2 pages
//   <NtxPage>     v3 pages (v2/ink2 pages authored in Page Designer)
const PAGE_ROOT_ELEMENTS = [
    'skuidpage',
    'skuid__page',
    'NtxPage'
];

/**
 * Performs a very basic sanity test on whether the input file is valid Skuid Page XML.
 *
 * @param pageXml {String} Skuid Page XML
 * @returns {Boolean}
 */
function isValidPageXML(pageXml: string): boolean {
    // Our goal here is just to prevent users from inadvertently grabbing non-Skuid XML files
    // via a glob pattern. We will defer to server-side validation to ensure the XML is
    // properly formatted.
    // Step over an optional XML declaration so that its presence does not cause an
    // otherwise-valid page to be rejected.
    const trimmed = pageXml.trim().replace(/^<\?[\S\s]*?\?>\s*/, '');
    return PAGE_ROOT_ELEMENTS.some(rootElement => trimmed.startsWith(`<${rootElement}`));
}

export {
    condenseXml,
    formatXml,
    isValidPageXML,
    PAGE_ROOT_ELEMENTS
};
