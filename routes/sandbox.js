const express = require('express');
const { payloadCatalog, apiDocumentation } = require('../utils/dataLoader');

const router = express.Router();

// Route: GET /info
router.get('/info', (req, res) => {
    const mergedInfoResponse = {
        ...apiDocumentation,
        payload_catalog: payloadCatalog
    };
    res.status(200).json(mergedInfoResponse);
});

// Route: ALL /echo
router.all('/echo', (req, res) => {
    res.status(200).json({
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body || {}
    });
});

// Route: ALL /test
router.all('/test', (req, res) => {
    const targetStatus = parseInt(req.query.status, 10) || 200;
    const delayMs = parseInt(req.query.delay, 10) || 0;
    const reflectHeaders = req.query.headers === 'true';
    const payloadParam = req.query.payload; 
    const requestedType = (req.query.payloadType || 'json').toLowerCase();

    if (reflectHeaders) {
        for (const [key, value] of Object.entries(req.headers)) {
            res.setHeader(`omd-header__${key}`, value);
        }
    }

    let responseBody;
    let responseContentType = requestedType === 'xml' ? 'application/xml' : 'application/json';

    if (payloadParam === 'body') {
        responseBody = req.body || {};
        responseContentType = req.headers['content-type'] || responseContentType;
    } else {
        const typePrefix = requestedType === 'xml' ? 'xml' : 'json';
        const exactKey = `${typePrefix}_${targetStatus}`;
        const category = Math.floor(targetStatus / 100);
        const categoryKey = `${typePrefix}_${category}xx`;
        const fallbackKey = `${typePrefix}_xxx`;

        let selectedPayload;

        if (payloadParam && payloadCatalog[payloadParam]) {
            selectedPayload = payloadCatalog[payloadParam];
            responseContentType = payloadParam.startsWith('xml') ? 'application/xml' : 'application/json';
        } else if (payloadCatalog[exactKey]) {
            selectedPayload = payloadCatalog[exactKey];
        } else if (payloadCatalog[categoryKey]) {
            selectedPayload = payloadCatalog[categoryKey];
        } else {
            selectedPayload = payloadCatalog[fallbackKey];
        }

        if (responseContentType === 'application/json' && typeof selectedPayload === 'object') {
            responseBody = { ...selectedPayload, code: targetStatus };
        } else if (responseContentType === 'application/xml' && typeof selectedPayload === 'string') {
            responseBody = selectedPayload.replace('<code>0</code>', `<code>${targetStatus}</code>`);
        } else {
            responseBody = selectedPayload;
        }
    }

    const executeResponse = () => {
        res.status(targetStatus).type(responseContentType).send(responseBody);
    };

    if (delayMs > 0) {
        setTimeout(executeResponse, delayMs);
    } else {
        executeResponse();
    }
});

module.exports = router;