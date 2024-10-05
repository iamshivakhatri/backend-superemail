const { getAuthUrl, getTokens, oauth2Client, refreshAccessToken } = require('../utils/oauth2');
const { google } = require('googleapis');

const authorize = (req, res) => {
    console.log('Authorize function called');
    const authUrl = getAuthUrl();
    console.log('Generated Auth URL:', authUrl);
    res.redirect(authUrl);
};

const handleCallback = async (req, res) => {
    console.log('Callback received. Query parameters:', req.query);
    const { code } = req.query;
    try {
        if (!code) {
            throw new Error('No code provided in the callback');
        }
        const tokens = await getTokens(code);
        console.log('Received tokens:', tokens);
        
        // Update the redirect URL to match your Next.js route
        res.redirect(`http://localhost:3001/auth-callback?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    } catch (error) {
        console.error('Error in handleCallback:', error);
        res.status(400).json({ error: 'Failed to get tokens', details: error.message });
    }
};

// Send email route
const sendEmail = async (req, res) => {
    const { recipients, subject, body, userEmail, tokens } = req.body;

    try {
        // Check if the access token is expired and refresh if necessary
        if (Date.now() > tokens.expiry_date) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            tokens.access_token = newTokens.access_token;
            tokens.expiry_date = newTokens.expiry_date;
        }

        oauth2Client.setCredentials(tokens);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const results = await Promise.all(recipients.map(async (recipient) => {
            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `From: ${userEmail}`,
                `To: ${recipient.email}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=utf-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                body.replace('[Name]', recipient.name),
            ];
            const message = messageParts.join('\n');

            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            return { email: recipient.email, messageId: result.data.id };
        }));

        console.log('Messages sent successfully:', results);
        res.status(200).json({ message: 'Emails sent successfully', info: results });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ message: 'Error sending emails', error: error.message });
    }
};

console.log('Exporting from emailController:', { authorize, handleCallback, sendEmail });

module.exports = { authorize, handleCallback, sendEmail };
