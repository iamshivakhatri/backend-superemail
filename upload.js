require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Update sent and delivered stats for a specific campaign
async function updateCampaignStats(campaignId) {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const db = client.db();
    const campaignsCollection = db.collection('Campaign');

    // const campaigns = await campaignsCollection.find().toArray();
    // if (campaigns.length > 0) {
    //   console.log('Campaigns Collection Data:', campaigns);
    // }

    // Generate random values for sent and delivered
    const sent = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
    const delivered = Math.floor(Math.random() * sent); // Random number less than or equal to sent

    // Update the campaign document with new sent and delivered values
    const result = await campaignsCollection.updateOne(
      { _id: ObjectId.createFromHexString(campaignId) }, // Ensure `campaignId` is in string format
      {
        $set: {
          sent: sent,
          delivered: delivered,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Campaign ${campaignId} updated successfully.`);
      console.log(`New values - Sent: ${sent}, Delivered: ${delivered}`);
    } else {
      console.log(`No campaign found with ID: ${campaignId}`);
    }

  } catch (error) {
    console.error('Error updating campaign stats:', error);
  } finally {
    await client.close();
  }
}

// Display all documents in the Campaigns collection
async function displayCampaigns() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const db = client.db();
    const campaignsCollection = db.collection('Campaigns');

    // Retrieve and display all campaigns
    const campaigns = await campaignsCollection.find().toArray();
    console.log('Campaigns:', campaigns);

  } catch (error) {
    console.error('Error retrieving campaigns:', error);
  } finally {
    await client.close();
  }
}

// Run the functions
const campaignId = "67201a2537591d4703010bfd"; // Replace with the actual campaign ID as a string

// Uncomment the one you want to run:
updateCampaignStats(campaignId);
// displayCampaigns();
