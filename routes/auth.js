const express = require('express');
const { 
    authorize, 
    handleCallback, 
    sendEmail, 
    trackEmailOpen, 
    trackEmailLink, 
    getEmailStats,
    getUserInfo // Add this line
} = require('../controllers/emailController');
const cors = require('cors');

const router = express.Router();

module.exports = function(corsOptions) {
    // Add this at the top of your routes
    router.options('*', cors(corsOptions));

    // Route to start OAuth2 flow
    router.get('/google', authorize);

    // Route to handle Google callback
    router.get('/google/callback', handleCallback);

    // Route to send an email
    router.post('/send-email', cors(corsOptions), sendEmail);

    // Update this route
    router.get('/track/:trackingId', cors(corsOptions), trackEmailOpen);

    // New route to fetch email stats
    router.post('/email-stats', cors(corsOptions), getEmailStats);

    // New routes for tracking
    router.get('/track-link/:trackingId', trackEmailLink);

    // Allow both GET and POST requests for tracking
    router.post('/track/:trackingId', cors(corsOptions), trackEmailOpen);

    // Add this new route
    router.post('/user-info', cors(corsOptions), getUserInfo);

    return router;
};
