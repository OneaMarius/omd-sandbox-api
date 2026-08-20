const convert = require('xml-js');

/**
 * Recursively flattens the xml-js object structure (removes _text, etc.)
 */
function flattenXmlJson(obj) {
	if (typeof obj === 'object' && obj !== null) {
		if (Array.isArray(obj)) return obj.map(flattenXmlJson);

		// If the node has both attributes and text, we want to merge them
		if (obj.hasOwnProperty('_text') && obj.hasOwnProperty('_attributes')) {
			const val = obj._text;
			const parsedVal = !isNaN(val) && !isNaN(parseFloat(val)) ? Number(val) : val;
			return { ...obj._attributes, value: parsedVal };
		}

		// Standard extraction for nodes with only _text
		if (Object.keys(obj).length === 1 && obj.hasOwnProperty('_text')) {
			const val = obj._text;
			return !isNaN(val) && !isNaN(parseFloat(val)) ? Number(val) : val;
		}

		const result = {};
		for (let key in obj) {
			// Keep attributes in the parent node if it's a mix,
			// otherwise ignore metadata keys
			if (key === '_attributes') {
				Object.assign(result, obj[key]);
			} else if (key !== '_declaration') {
				result[key] = flattenXmlJson(obj[key]);
			}
		}
		return result;
	}
	return obj;
}

function jsonToXml(jsonObj) {
	try {
		const rootObject = { response: jsonObj };
		return convert.json2xml(rootObject, { compact: true, spaces: 2, ignoreComment: true });
	} catch (error) {
		return `<error><message>JSON to XML conversion failed</message></error>`;
	}
}

/**
 * Wraps JSON into a standard SOAP Envelope
 */
function jsonToSoap(jsonObj) {
	try {
		const soapObject = {
			'soapenv:Envelope': { _attributes: { 'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/' }, 'soapenv:Body': { response: jsonObj } },
		};
		return convert.json2xml(soapObject, { compact: true, spaces: 2 });
	} catch (error) {
		return `<soapenv:Envelope><soapenv:Body><error>SOAP conversion failed</error></soapenv:Body></soapenv:Envelope>`;
	}
}

function xmlToJson(xmlString) {
	try {
		const rawJson = convert.xml2json(xmlString, { compact: true, spaces: 2 });
		return flattenXmlJson(JSON.parse(rawJson));
	} catch (error) {
		return { error: 'XML to JSON conversion failed' };
	}
}

module.exports = { jsonToXml, xmlToJson, jsonToSoap };
