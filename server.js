const express = require('express');
const cors = require('cors');
const sandboxRoutes = require('./routes/sandbox');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes and origins
app.use(cors());

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/xml', 'application/xml', 'text/plain'] }));

// Mount the router to the specified base path
app.use('/omd-sandbox', sandboxRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`OMD Sandbox API running on port ${PORT}`);
});