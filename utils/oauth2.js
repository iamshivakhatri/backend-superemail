// const { google } = require('googleapis');
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://backend-superemail.onrender.com/auth/google/callback'
);

const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/contacts.readonly',
    'profile',
];

const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
};

const getTokens = async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
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

// module.exports = { oauth2Client, getAuthUrl, getTokens, refreshAccessToken };
export { oauth2Client, getAuthUrl, getTokens, refreshAccessToken };

