import { xml, xmlmin } from 'vkbeautify';

const PADDING = ' '.repeat(2); // set desired indent size here

/**
 * Pretty-prints a string of XML, adding indentation and newlines between tags
 * @param condensedXml {String} Skuid Page XML
 * @returns {String}
 */
function formatXml(condensedXml: string): string {
    return xml(condensedXml, PADDING);
}

/**
 * Minifies a string of XML by removing all whitespace between XML tags.
 * Whitespace within tags should be preserved.
 * @param prettyXml {String} Skuid Page XML
 * @returns {String}
 */
function condenseXml(prettyXml: string): string {
    return xmlmin(prettyXml);
}

/**
 * Performs a very basic sanity test on whether the input file is valid Skuid Page XML.
 * @param pageXml {String} Skuid Page XML
 * @returns {Boolean}
 */
function isValidPageXML(pageXml: string) {
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
