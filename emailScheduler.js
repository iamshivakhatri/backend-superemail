import Queue from 'bull';
import dotenv from 'dotenv';
import { getAuthUrl, getTokens, oauth2Client, refreshAccessToken } from './utils/oauth2.js';
import { google } from 'googleapis';
import { 
    updateOpenedCount, 
    getCampaignById, 
    updateCampaignStats, 
    getTrackingDataByIds 
} from './services/campaignServices.js';
import crypto from 'crypto';





// import { sendEmail } from './controllers/emailController.js';

dotenv.config();

const redisConfig = {
    redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 30000,
    }
};

const emailQueue = new Queue('email-queue', redisConfig);

// const sendEmail = async (recipients, subject, body, userEmail, tokens) => {
//     // Simulate email sending with a delay
//     await new Promise(resolve => setTimeout(resolve, 2000));
//     console.log('Email sent to:', recipients, 'with subject:', subject);
// }

const sendEmail = async (recipients, subject, body, userEmail, tokens, campaignId, userId) => {
    try {
        // Check campaign ID format
        if (!campaignId || typeof campaignId !== 'string' || campaignId.length !== 24) {
            throw new Error('Invalid campaignId format. Must be a 24-character hex string.');
        }
        
        // Refresh access token if needed
        if (Date.now() > tokens.expiry_date) {
            const newTokens = await refreshAccessToken(tokens.refresh_token);
            tokens.access_token = newTokens.access_token;
            tokens.expiry_date = newTokens.expiry_date;
        }

        oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        let totalSent = 0;
        let totalDelivered = 0;

        const results = await Promise.all(recipients.map(async (recipient) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
                console.warn('Invalid email address skipped:', recipient.email);
                return { email: recipient.email, error: 'Invalid email address' };
            }

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
            const encodedMessage = Buffer.from(messageParts.join('\n'))
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            totalSent++;

            try {
                const result = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: encodedMessage },
                });
                totalDelivered++;
                return { email: recipient.email, messageId: result.data.id, trackingId };
            } catch (error) {
                console.error('Error sending email to:', recipient.email, error);
                return { email: recipient.email, error: error.message };
            }
        }));

        // Update stats
        await updateCampaignStats(campaignId, { totalSent, totalDelivered });

        // Check if there were any errors
        const failedEmails = results.filter(result => result.error);
        if (failedEmails.length > 0) {
            throw new Error(`Failed to send some emails: ${failedEmails.map(e => e.email).join(', ')}`);
        }

        return { success: true, results };
    } catch (error) {
        console.error('Error in sendEmail:', error);
        return { success: false, error: error.message };
    }
};

// Queue job processing
emailQueue.process(10, async (job) => {
    console.log(`Started processing job ${job.id} at ${new Date().toISOString()}`);
    const { recipients, subject, body, userEmail, tokens, campaignId } = job.data;

    try {
        const result = await sendEmail(recipients, subject, body, userEmail, tokens, campaignId);
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred during email sending');
        }
        
        console.log(`Completed job ${job.id} for campaign ${campaignId} at ${new Date().toISOString()}`);
        return result;
    } catch (error) {
        console.error(`Error processing job ${job.id} for campaign ${campaignId}:`, error);
        throw error;
    }
});

// Error handling for scheduling
export async function scheduleEmail({
    recipients,
    subject,
    body,
    userEmail,
    tokens,
    campaignId,
    userId,
    sendDate,
    uniqueId
}) {
    try {
        const scheduledTime = new Date(sendDate).getTime();
        const currentTime = Date.now();
        
        if (scheduledTime <= currentTime) {
            throw new Error('Schedule time must be in the future');
        }

        const delay = scheduledTime - currentTime;

        const job = await emailQueue.add(
            {
                recipients,
                subject,
                body,
                userEmail,
                tokens,
                campaignId,
                userId,
                scheduledTime,
                uniqueId
            },
            {
                delay,
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true
            }
        );

        console.log(`Scheduled job ${job.id} for ${new Date(scheduledTime).toISOString()}`);
        return { 
            success: true, 
            message: 'Email scheduled successfully', 
            jobId: job.id, 
            scheduledTime: new Date(scheduledTime).toISOString() 
        };
    } catch (error) {
        console.error('Error scheduling email:', error);
        return { success: false, error: error.message };
    }
}



// Queue event listeners
emailQueue.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed at ${new Date().toISOString()}:`, error);
});

emailQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed at ${new Date().toISOString()}`);
});

emailQueue.on('active', (job) => {
    console.log(`Job ${job.id} started at ${new Date().toISOString()}`);
});

console.log('Worker is running and waiting for jobs...');

export default { scheduleEmail };