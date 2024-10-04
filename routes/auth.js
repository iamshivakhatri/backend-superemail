// routes/auth.js
const express = require('express');
const { authorize, sendEmail } = require('../controllers/emailController');

const router = express.Router();

// Route to start OAuth2 flow
router.get('/google', authorize);

// Route to handle Google callback
router.get('/google/callback', (req, res) => {
    res.redirect('/auth/google');
});

// Route to send an email
router.post('/send-email', sendEmail);

module.exports = router;
