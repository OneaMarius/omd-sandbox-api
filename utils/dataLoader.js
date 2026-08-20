const fs = require('fs');
const path = require('path');

const payloadsPath = path.join(__dirname, '..', 'data', 'payloads.json');
const infoPath = path.join(__dirname, '..', 'data', 'info.json');

let payloadCatalog = {};
let apiDocumentation = {};

try {
    const rawPayloads = fs.readFileSync(payloadsPath, 'utf8');
    payloadCatalog = JSON.parse(rawPayloads);
    
    const rawInfo = fs.readFileSync(infoPath, 'utf8');
    apiDocumentation = JSON.parse(rawInfo);
} catch (error) {
    console.error('Initialization Error: Failed to load data files.', error.message);
    process.exit(1);
}

module.exports = {
    payloadCatalog,
    apiDocumentation
};