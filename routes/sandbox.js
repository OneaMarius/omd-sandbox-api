const express = require('express');
const { payloadCatalog, apiDocumentation } = require('../utils/dataLoader');
const { jsonToXml, xmlToJson, jsonToSoap } = require('../utils/converter');

const router = express.Router();

// Middleware Universal Catch-All
router.use((req, res) => {
    // Extragerea modului solicitat (default: info)
    const mode = (req.query.omd_mode || 'info').toLowerCase();

    // Validare strictă a parametrului
    const allowedModes = ['info', 'echo', 'test'];
    if (!allowedModes.includes(mode)) {
        return res.status(400).json({
            error: "Invalid parameter value",
            message: `The provided omd_mode '${mode}' is not supported.`,
            supported_modes: allowedModes
        });
    }

    // ==========================================
    // MODE 1: INFO (Documentation)
    // ==========================================
    if (mode === 'info') {
        const mergedInfoResponse = { ...apiDocumentation, payload_catalog: payloadCatalog };
        return res.status(200).json(mergedInfoResponse);
    }

    // ==========================================
    // MODE 2: ECHO (Request Inspection)
    // ==========================================
    if (mode === 'echo') {
        return res.status(200).json({
            method: req.method,
            original_url: req.originalUrl,
            path: req.path,
            headers: req.headers,
            query: req.query,
            body: req.body || {}
        });
    }

    // ==========================================
    // MODE 3: TEST (Dynamic Mocking)
    // ==========================================
    if (mode === 'test') {
        // Extract control parameters
        const targetStatus = parseInt(req.query.omd_status, 10) || 200;
        const delayMs = parseInt(req.query.omd_delay, 10) || 0;
        const reflectHeaders = req.query.omd_headers === 'true';
        const payloadParam = req.query.omd_payload;
        const requestedType = (req.query.omd_payloadType || 'json').toLowerCase();
        const convertParam = (req.query.omd_convert || '').toLowerCase();

        // Header reflection
        if (reflectHeaders) {
            for (const [key, value] of Object.entries(req.headers)) {
                res.setHeader(`omd-header__${key}`, value);
            }
        }

        // Determine response payload and Content-Type
        let responseBody;
        let responseContentType;

        if (requestedType === 'soap') responseContentType = 'text/xml';
        else if (requestedType === 'xml') responseContentType = 'application/xml';
        else responseContentType = 'application/json';

        if (payloadParam === 'body') {
            responseBody = req.body || {};
            responseContentType = req.headers['content-type'] || responseContentType;
        } else {
            const typePrefix = ['xml', 'soap'].includes(requestedType) ? requestedType : 'json';
            const exactKey = `${typePrefix}_${targetStatus}`;
            const category = Math.floor(targetStatus / 100);
            const categoryKey = `${typePrefix}_${category}xx`;
            const fallbackKey = `${typePrefix}_xxx`;

            let selectedPayload;

            if (payloadParam && payloadCatalog[payloadParam]) {
                selectedPayload = payloadCatalog[payloadParam];
                if (payloadParam.startsWith('soap')) responseContentType = 'text/xml';
                else if (payloadParam.startsWith('xml')) responseContentType = 'application/xml';
                else responseContentType = 'application/json';
            } else if (payloadCatalog[exactKey]) {
                selectedPayload = payloadCatalog[exactKey];
            } else if (payloadCatalog[categoryKey]) {
                selectedPayload = payloadCatalog[categoryKey];
            } else {
                selectedPayload = payloadCatalog[fallbackKey];
            }

            // Dynamic status code injection for generic payloads
            if (responseContentType === 'application/json' && typeof selectedPayload === 'object') {
                responseBody = { ...selectedPayload, code: targetStatus };
            } else if (responseContentType.includes('xml') && typeof selectedPayload === 'string') {
                responseBody = selectedPayload.replace('<code>0</code>', `<code>${targetStatus}</code>`);
            } else {
                responseBody = selectedPayload;
            }
        }

        // Payload conversion (XML <-> JSON or JSON -> SOAP)
        if (convertParam === 'xml' && responseContentType.includes('json')) {
            responseBody = jsonToXml(responseBody);
            responseContentType = 'application/xml';
        } else if (convertParam === 'json' && responseContentType.includes('xml')) {
            responseBody = xmlToJson(responseBody);
            responseContentType = 'application/json';
        } else if (convertParam === 'soap' && responseContentType.includes('json')) {
            responseBody = jsonToSoap(responseBody);
            responseContentType = 'text/xml';
        }

        // Final response execution with latency simulation
        const executeResponse = () => {
            res.status(targetStatus).type(responseContentType).send(responseBody);
        };

        if (delayMs > 0) {
            setTimeout(executeResponse, delayMs);
        } else {
            executeResponse();
        }
    }
});

module.exports = router;