const PADDING = ' '.repeat(2); // set desired indent size here
const reg = /(>)(<)(\/*)/g;

function formatXml(xml: string) {
    let pad = 0;

    // Remove all the newlines and then remove all the spaces between tags
    xml = xml.replace(/(\r\n|\n|\r)/gm, ' ').replace(/>\s+</g, '><');
    xml = xml.replace(reg, '$1\r\n$2$3');

    return xml.split('\r\n').map((node, index) => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/) && pad > 0) {
            pad -= 1;
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        pad += indent;

        return PADDING.repeat(pad - indent) + node;
    }).join('\r\n');
}

export {
    formatXml
};
