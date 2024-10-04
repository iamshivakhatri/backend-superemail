// controllers/emailController.js
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
];

// Authorization route
const authorize = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
    res.redirect(authUrl);
};

// Send email route
const sendEmail = async (req, res) => {
    const { to, subject, body, userEmail, tokens } = req.body; // Include userEmail and tokens

    oauth2Client.setCredentials(tokens);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: userEmail,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
        },
    });

    const mailOptions = {
        from: userEmail,
        to: to,
        subject: subject,
        text: body,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Error sending email', error });
        }
        res.status(200).json({ message: 'Email sent successfully', info });
    });
};

module.exports = { authorize, sendEmail };
