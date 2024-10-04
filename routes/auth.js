const express = require('express');
const { authorize, handleCallback, sendEmail } = require('../controllers/emailController');

console.log('Imported in auth.js:', { 
    authorize: typeof authorize, 
    handleCallback: typeof handleCallback, 
    sendEmail: typeof sendEmail 
});

const router = express.Router();

// Route to start OAuth2 flow
router.get('/google', (req, res) => {
    console.log('Google route accessed');
    if (typeof authorize === 'function') {
        authorize(req, res);
    } else {
        console.error('authorize is not a function');
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle Google callback
router.get('/google/callback', (req, res) => {
    console.log('Callback route accessed');
    if (typeof handleCallback === 'function') {
        handleCallback(req, res);
    } else {
        console.error('handleCallback is not a function');
        res.status(500).send('Internal Server Error');
    }
});

// Route to send an email
router.post('/send-email', sendEmail);

module.exports = router;
