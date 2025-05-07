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
    const trimmed = pageXml.trim();
    return trimmed.startsWith('<skuidpage') || trimmed.startsWith('<skuid__page');
}

export {
    condenseXml,
    formatXml,
    isValidPageXML
};
