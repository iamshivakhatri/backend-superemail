import { scheduleEmail } from './emailScheduler.js';

// Define the target time in EST
const estHour = 1; // 1 AM in EST
const estMinute = 17; // 17 minutes past the hour

// Get the current date and time in UTC
const now = new Date();

// Calculate the target date in UTC by adjusting the EST time to UTC (add 5 hours)
const targetDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    estHour + 5, // 1 AM EST is 6 AM UTC
    estMinute
));

console.log("Now (UTC):", now.toISOString());

// Check if the target time has already passed today in UTC
if (targetDate < now) {
    console.log(`Target time has already passed. Scheduling for tomorrow at ${estHour}:${estMinute} EST.`);
    targetDate.setUTCDate(targetDate.getUTCDate() + 1); // Move to 1:17 AM EST the next day
}

const sendDate = targetDate;
console.log("Scheduled send date (UTC):", sendDate.toISOString());



// // Example usage
// try {
//     console.log(`Attempting to schedule email for ${sendDate}`);
//     async function helper_function () {
//         const result = await scheduleEmail({
//             recipients: "shiva.khatri01@gmail.com",
//             subject: "Welcome Email",
//             body: "Hello world",
//             userEmail: "sender@example.com",
//             tokens: ["token1", "token2"],
//             campaignId: "camp123",
//             userId: "user123",
//             sendDate: sendDate,
//             uniqueId: "job1" // Add a unique identifier
//         });
//         console.log('Email scheduled:', result);
    
//         const result2 = await scheduleEmail({
//             recipients: "shiva.khatri01@gmail.com",
//             subject: "Welcome Email",
//             body: "Hello world",
//             userEmail: "sender@example.com",
//             tokens: ["token1", "token2"],
//             campaignId: "camp123",
//             userId: "user123",
//             sendDate: sendDate,
//             uniqueId: "job2" // Different identifier for the second job
//         });
//         console.log('Email scheduled:', result2);
//     }
    
//     helper_function();
    
// } catch (error) {
//     console.error('Failed to schedule email:', error);
// }

