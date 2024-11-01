const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { getAuthUrl, getTokens, oauth2Client, refreshAccessToken } = require('../utils/oauth2');
const { google } = require('googleapis');
const NodeCache = require('node-cache');
const {
    updateOpenedCount,
    getCampaignById,
    updateCampaignStats,
    getTrackingDataByIds,
  } = require('../services/campaignServices');


  

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
// const sendEmail = async (req, res) => {
//     const { recipients, subject, body, userEmail, tokens, campaignId, userId } = req.body;

//     try {
//         // Refresh access token if expired
//         if (Date.now() > tokens.expiry_date) {
//             const newTokens = await refreshAccessToken(tokens.refresh_token);
//             tokens.access_token = newTokens.access_token;
//             tokens.expiry_date = newTokens.expiry_date;
//         }

//         oauth2Client.setCredentials(tokens);
//         const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

//         console.log('Sending emails to:', recipients);
//         console.log('Subject:', subject);
//         console.log('User Email:', userEmail);

//         // Email validation regex
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//         let totalSent = 0;
//         let totalDelivered = 0;

//         const results = await Promise.all(recipients.map(async (recipient) => {
//             if (!emailRegex.test(recipient.email)) {
//                 console.warn('Invalid email address skipped:', recipient.email);
//                 return { email: recipient.email, error: 'Invalid email address' };
//             }

//             // Generate tracking ID and URL
//             const trackingId = crypto.randomBytes(16).toString('hex');
//             // const trackingUrl = `https://backend-superemail.onrender.com/auth/track/${trackingId}`;
//             const trackingUrl = `https://backend-superemail.onrender.com/auth/track/${trackingId}?campaignId=${campaignId}`;
//             const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="tracking pixel">`;

//             const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
//             const messageParts = [
//                 `From: ${userEmail}`,
//                 `To: ${recipient.email}`,
//                 `Subject: ${utf8Subject}`,
//                 'MIME-Version: 1.0',
//                 'Content-Type: text/html; charset=utf-8',
//                 'Content-Transfer-Encoding: 7bit',
//                 '',
//                 `${body.replace('[Name]', recipient.name)}${trackingPixel}`,
//             ];
//             const message = messageParts.join('\n');
//             const encodedMessage = Buffer.from(message)
//                 .toString('base64')
//                 .replace(/\+/g, '-')
//                 .replace(/\//g, '_')
//                 .replace(/=+$/, '');

//             totalSent++; // Increment the sent count

//             try {
//                 // Send the email via Gmail API
//                 const result = await gmail.users.messages.send({
//                     userId: 'me',
//                     requestBody: {
//                         raw: encodedMessage,
//                     },
//                 });
//                 console.log('Email sent successfully to:', recipient.email);
//                 totalDelivered++; // Increment the delivered count for successful sends
//                 return { email: recipient.email, messageId: result.data.id, trackingId };
//             } catch (error) {
//                 console.error('Error sending email to:', recipient.email, error);
//                 return { email: recipient.email, error: error.message };
//             }
//         }));

//         console.log('Email sending results:', results);

//         // Update campaign statistics in the database
//         await updateCampaignStats(campaignId, { totalSent, totalDelivered });

//         console.log(`Total sent: ${totalSent}, Total delivered: ${totalDelivered}`);
//         console.log('Emails sent with results:', results);  

//         res.status(200).json({ message: 'Emails sent with results', info: results });
        
//     } catch (error) {
//         console.error('Error in sendEmail:', error);
//         res.status(500).json({ message: 'Error sending emails', error: error.message });
//     }
// };

const sendEmail = async (req, res) => {
    const { recipients, subject, body, userEmail, tokens, campaignId, userId } = req.body;
    
    try {
        // Refresh access token if expired
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
        
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        let totalSent = 0;
        let totalDelivered = 0;
        
        const results = await Promise.all(recipients.map(async (recipient) => {
            if (!emailRegex.test(recipient.email)) {
                console.warn('Invalid email address skipped:', recipient.email);
                return { email: recipient.email, error: 'Invalid email address' };
            }
            
            // Generate tracking ID and URL
            const trackingId = crypto.randomBytes(16).toString('hex');
            const trackingUrl = `https://backend-superemail.onrender.com/auth/track/${trackingId}?campaignId=${campaignId}`;
            const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="tracking pixel">`;
            
            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `From: ${userEmail}`,
                `To: ${recipient.email}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                `${body.replace('[Name]', recipient.name)}${trackingPixel}`,
            ];
            const message = messageParts.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            
            totalSent++; // Increment the sent count
            
            try {
                // Send the email via Gmail API
                const result = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: {
                        raw: encodedMessage,
                    },
                });
                console.log('Email sent successfully to:', recipient.email);
                totalDelivered++; // Increment the delivered count for successful sends
                return { email: recipient.email, messageId: result.data.id, trackingId };
            } catch (error) {
                console.error('Error sending email to:', recipient.email, error);
                return { email: recipient.email, error: error.message };
            }
        }));
        
        console.log('Email sending results:', results);
        
        // Update campaign statistics in the database
        await updateCampaignStats(campaignId, { totalSent, totalDelivered });
        
        console.log(`Total sent: ${totalSent}, Total delivered: ${totalDelivered}`);
        console.log('Emails sent with results:', results);
        
        res.status(200).json({ 
            message: 'Emails sent with results', 
            info: results,
            statistics: {
                totalSent,
                totalDelivered
            }
        });
        
    } catch (error) {
        console.error('Error in sendEmail:', error);
        res.status(500).json({ message: 'Error sending emails', error: error.message });
    }
};



const trackEmailOpen = async (req, res) => {
    try {
        const { trackingId } = req.params; // This is the trackingId from the URL
        const campaignId = req.query.campaignId; // Get campaignId from query parameters
        console.log(`Tracking request received for campaign ID: ${campaignId}, tracking ID: ${trackingId}`);

        // Update the opened count in the campaign table, if not already counted
        await updateOpenedCount(campaignId, trackingId);

        // Determine the appropriate response based on the request
        if (req.headers.accept && req.headers.accept.includes('image/')) {
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
            res.status(200).send('Email opened');
        }
    } catch (error) {
        console.error('Error in trackEmailOpen:', error);
        res.status(500).send('Internal Server Error');
    }
};


// Add this function to parse the User-Agent string
function parseUserAgent(userAgent) {
    let device = 'Unknown';
    let os = 'Unknown';
    let browser = 'Unknown';

    if (/mobile/i.test(userAgent)) {
        device = 'Mobile';
    } else if (/tablet/i.test(userAgent)) {
        device = 'Tablet';
    } else {
        device = 'Desktop';
    }

    if (/windows/i.test(userAgent)) {
        os = 'Windows';
    } else if (/macintosh|mac os x/i.test(userAgent)) {
        os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
        os = 'Linux';
    } else if (/android/i.test(userAgent)) {
        os = 'Android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        os = 'iOS';
    }

    if (/chrome/i.test(userAgent)) {
        browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
        browser = 'Firefox';
    } else if (/safari/i.test(userAgent)) {
        browser = 'Safari';
    } else if (/msie|trident/i.test(userAgent)) {
        browser = 'Internet Explorer';
    } else if (/edge/i.test(userAgent)) {
        browser = 'Edge';
    }

    return { device, os, browser, userAgent };
}

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
        console.log('getEmailStats called with tracking IDs:', trackingIds);
        
        if (!Array.isArray(trackingIds)) {
            throw new Error('trackingIds must be an array');
        }
        
        const trackingData = await readTrackingData();
        console.log('Current tracking data:', JSON.stringify(trackingData, null, 2));
        
        const stats = trackingIds.reduce((acc, id) => {
            console.log(`Processing tracking ID: ${id}`);
            const data = trackingData[id] || { openCount: 0, clickCount: 0, devices: [] };
            console.log(`Data for tracking ID ${id}:`, JSON.stringify(data, null, 2));
            acc.totalOpened += data.openCount || 0;
            acc.totalClicks += data.clickCount || 0;
            if (data.openCount > 0) acc.uniqueOpens += 1;
            acc.detailedStats.push({
                id,
                email: data.email || 'unknown',
                openCount: data.openCount || 0,
                clickCount: data.clickCount || 0,
                lastOpened: data.lastOpened,
                lastClicked: data.lastClicked,
                devices: data.devices || []
            });
            return acc;
        }, { totalSent: trackingIds.length, totalOpened: 0, totalClicks: 0, uniqueOpens: 0, detailedStats: [] });
        
        console.log('Calculated stats:', JSON.stringify(stats, null, 2));
        res.json(stats);
    } catch (error) {
        console.error('Error in getEmailStats:', error);
        res.status(500).json({ error: error.message });
    }
};


const getUserInfo = async (req, res) => {
    try {
        const { tokens } = req.body;
        
        if (!tokens || !tokens.access_token) {
            throw new Error('No access token provided');
        }

        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userInfo = await response.json();
        res.json(userInfo);
    } catch (error) {
        console.error('Error in getUserInfo:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    authorize, 
    handleCallback, 
    sendEmail, 
    trackEmailOpen, 
    trackEmailLink, 
    trackEmailJS, 
    getEmailStats,
    getUserInfo
};