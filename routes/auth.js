import express from 'express';
import cors from 'cors';
import { 
    authorize, 
    handleCallback, 
    sendEmail, 
    trackEmailOpen, 
    trackEmailLink, 
    getEmailStats,
    getUserInfo,
    scheduleEmail 
} from '../controllers/emailController.js';

const router = express.Router();

// const express = require('express');
// const { 
//     authorize, 
//     handleCallback, 
//     sendEmail, 
//     trackEmailOpen, 
//     trackEmailLink, 
//     getEmailStats,
//     getUserInfo,
//     scheduleEmail
// } = require('../controllers/emailController');


// const cors = require('cors');


// const router = express.Router();

const authRoutes = (corsOptions) => {
    // Add this at the top of your routes
    router.options('*', cors(corsOptions));

    // Route to start OAuth2 flow
    router.get('/google', authorize);

    // Route to handle Google callback
    router.get('/google/callback', handleCallback);

    // Route to send an email
    router.post('/send-email', cors(corsOptions), sendEmail);

    router.post('/schedule-email', cors(corsOptions), scheduleEmail);

    // Update this route
    router.get('/track/:trackingId', cors(corsOptions), trackEmailOpen);
    router.post('/track/:trackingId', cors(corsOptions), trackEmailOpen);

    // New route to fetch email stats
    router.post('/email-stats', cors(corsOptions), getEmailStats);

    // New routes for tracking
    router.get('/track-link/:trackingId', trackEmailLink);

    // Add this new route
    router.post('/user-info', cors(corsOptions), getUserInfo);

    return router;
};

export default authRoutes;