const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { getAuthUrl, getTokens, oauth2Client, refreshAccessToken } = require('../utils/oauth2');
const { google } = require('googleapis');
const NodeCache = require('node-cache');

const trackingCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes

const trackingDataFile = path.join(__dirname, 'emailTrackingData.json');

// Function to read tracking data from file
async function readTrackingData() {
    let data = trackingCache.get('trackingData');
    if (data == undefined) {
        try {
            const fileData = await fs.readFile(trackingDataFile, 'utf8');
            data = JSON.parse(fileData);
            trackingCache.set('trackingData', data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                data = {};
            } else {
                throw error;
            }
        }
    }
    return data;
}

// Function to write tracking data to file
async function writeTrackingData(data) {
    trackingCache.set('trackingData', data);
    await fs.writeFile(trackingDataFile, JSON.stringify(data, null, 2));
}

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

        console.log('Sending emails to:', recipients);
        console.log('Subject:', subject);
        console.log('User Email:', userEmail);

        const results = await Promise.all(recipients.map(async (recipient) => {
            const trackingId = crypto.randomBytes(16).toString('hex');
            const trackingUrl = `https://emailapp-backend.onrender.com/auth/track/${trackingId}`;
            
            // Combine multiple tracking methods
            const trackingPixel = `
                <img src="${trackingUrl}" width="1" height="1" alt="" style="display:block !important;" />
                <div style="background-image: url('${trackingUrl}'); width: 1px; height: 1px;"></div>
                <!--[if mso]>
                <v:image xmlns:v="urn:schemas-microsoft-com:vml" style="display:none;" src="${trackingUrl}" />
                <![endif]-->
                <span style="color: transparent; display: none !important; font-size: 0; max-height: 0; line-height: 0; overflow: hidden;">
                    <img src="${trackingUrl}" alt="" width="1" height="1" border="0" />
                </span>
            `;
            
            // Add a text-based fallback
            const trackingText = `If you can't see this email properly, please <a href="${trackingUrl}">click here</a>.`;
            
            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `From: ${userEmail}`,
                `To: ${recipient.email}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                `${trackingText}${body.replace('[Name]', recipient.name)}${trackingPixel}`,
            ];
            const message = messageParts.join('\n');
            console.log('Full email content:', message);
            
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            try {
                const result = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: {
                        raw: encodedMessage,
                    },
                });
                console.log('Email sent successfully to:', recipient.email);
                return { email: recipient.email, messageId: result.data.id, trackingId };
            } catch (error) {
                console.error('Error sending email to:', recipient.email, error);
                console.error('Error details:', error.response ? error.response.data : error.message);
                throw error;
            }
        }));

        console.log('Messages sent successfully:', results);
        res.status(200).json({ message: 'Emails sent successfully', info: results });
    } catch (error) {
        console.error('Error in sendEmail:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Error sending emails', error: error.message, stack: error.stack });
    }
};

// New route to handle tracking pixel requests
const trackEmailOpen = async (req, res) => {
    console.log('trackEmailOpen called');
    console.log('Full request:', JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
        ip: req.ip
    }, null, 2));
    
    try {
        const { trackingId } = req.params;
        console.log(`Tracking request received for ID: ${trackingId}`);
        
        let trackingData = JSON.parse(await fs.readFile(trackingDataFile, 'utf8'));
        console.log('Current tracking data:', JSON.stringify(trackingData, null, 2));
        
        if (!trackingData[trackingId]) {
            trackingData[trackingId] = { 
                openCount: 0, 
                lastOpened: null, 
                email: 'unknown',
                userAgent: req.headers['user-agent'],
                ipAddresses: []
            };
            console.log(`Created new tracking data for ID: ${trackingId}`);
        }
        
        trackingData[trackingId].openCount += 1;
        trackingData[trackingId].lastOpened = new Date().toISOString();
        if (!trackingData[trackingId].ipAddresses.includes(req.ip)) {
            trackingData[trackingId].ipAddresses.push(req.ip);
        }

        // Update the file immediately
        await fs.writeFile(trackingDataFile, JSON.stringify(trackingData, null, 2));
        console.log(`Updated tracking data for ID ${trackingId}:`, JSON.stringify(trackingData[trackingId], null, 2));

        // Determine the appropriate response based on the request
        if (req.headers.accept && req.headers.accept.includes('image/')) {
            // Send a 1x1 transparent GIF for image requests
            const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/gif',
                'Content-Length': img.length,
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0',
            });
            res.end(img);
        } else {
            // For non-image requests (like clicking the link), send a simple response
            res.status(200).send('Email opened');
        }
    } catch (error) {
        console.error('Error in trackEmailOpen:', error);
        // Don't send an error response, as the email client doesn't expect one
        res.status(200).end();
    }
};

const trackEmailLink = async (req, res) => {
    console.log('trackEmailLink called');
    console.log('Request headers:', req.headers);
    console.log('Request IP:', req.ip);
    
    try {
        const { trackingId } = req.params;
        console.log(`Link tracking request received for ID: ${trackingId}`);
        
        let trackingData = await readTrackingData();
        
        if (!trackingData[trackingId]) {
            trackingData[trackingId] = { 
                openCount: 0, 
                clickCount: 0,
                lastClicked: null, 
                userAgent: req.headers['user-agent'],
                ipAddresses: []
            };
        }
        
        trackingData[trackingId].clickCount = (trackingData[trackingId].clickCount || 0) + 1;
        trackingData[trackingId].lastClicked = new Date().toISOString();
        trackingData[trackingId].ipAddresses.push(req.ip);
        await writeTrackingData(trackingData);
        console.log(`Updated tracking data for ID ${trackingId}:`, trackingData[trackingId]);

        res.redirect('http://localhost:3001/dashboard'); // Redirect to a neutral page or your website
    } catch (error) {
        console.error('Error in trackEmailLink:', error);
        res.status(500).send('Internal Server Error');
    }
};

const trackEmailJS = async (req, res) => {
    console.log('trackEmailJS called');
    await trackEmailOpen(req, res);
    res.status(200).send('OK');
};

const getEmailStats = async (req, res) => {
    try {
        const { trackingIds } = req.body;
        console.log('Received tracking IDs:', trackingIds);
        
        if (!Array.isArray(trackingIds)) {
            throw new Error('trackingIds must be an array');
        }
        
        const trackingData = JSON.parse(await fs.readFile(trackingDataFile, 'utf8'));
        console.log('Current tracking data:', JSON.stringify(trackingData, null, 2));
        
        const stats = trackingIds.reduce((acc, id) => {
            const data = trackingData[id] || { openCount: 0, clickCount: 0 };
            acc.totalOpened += data.openCount || 0;
            acc.totalClicks += data.clickCount || 0;
            if (data.openCount > 0) acc.uniqueOpens += 1;
            acc.detailedStats.push({
                id,
                email: data.email || 'unknown',
                openCount: data.openCount || 0,
                clickCount: data.clickCount || 0,
                lastOpened: data.lastOpened,
                lastClicked: data.lastClicked
            });
            return acc;
        }, { totalSent: trackingIds.length, totalOpened: 0, totalClicks: 0, uniqueOpens: 0, detailedStats: [] });
        
        console.log('Calculated stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Error in getEmailStats:', error);
        res.status(500).json({ error: error.message });
    }
};

console.log('Exporting from emailController:', { authorize, handleCallback, sendEmail, trackEmailOpen, trackEmailLink, trackEmailJS, getEmailStats });

module.exports = { 
    authorize, 
    handleCallback, 
    sendEmail, 
    trackEmailOpen, 
    trackEmailLink, 
    trackEmailJS, 
    getEmailStats 
};
