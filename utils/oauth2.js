const { google } = require('googleapis');

console.log('Environment variables:', {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI
});

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://6a34-192-122-237-12.ngrok-free.app/auth/google/callback'  // Update this line
);

const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

// If you're not using the full Gmail API, you might be able to use:
// const scopes = ['https://www.googleapis.com/auth/gmail.compose'];

const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
};

const getTokens = async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Tokens received:', tokens);
        return tokens;
    } catch (error) {
        console.error('Error getting tokens:', error);
        throw error;
    }
};

const refreshAccessToken = async (refreshToken) => {
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
};

module.exports = { oauth2Client, getAuthUrl, getTokens, refreshAccessToken };
