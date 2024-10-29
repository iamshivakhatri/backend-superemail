// services/campaignService.js
const connectToDatabase = require('../db');
const { ObjectId } = require('mongodb');


async function getCampaignById(campaignId) {
  const db = await connectToDatabase();
  return db.collection('Campaign').findOne({ _id: campaignId });
}

async function updateOpenedCount(campaignId, trackingId) {
  const db = await connectToDatabase();
  
  // Find the campaign and check if this trackingId is already marked as opened
  const campaign = await db.collection('Campaign').findOne({ _id: ObjectId.createFromHexString(campaignId) });
  if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found.`);
  }

  // If tracking ID is already in the openedRecipients array, skip the increment
  const openedRecipients = campaign.openedRecipients || [];
  if (openedRecipients.includes(trackingId)) {
      console.log(`Tracking ID ${trackingId} already recorded for campaign ID: ${campaignId}`);
      return;
  }

  // Otherwise, increment the opened count and add trackingId to openedRecipients
  const result = await db.collection('Campaign').updateOne(
      { _id: ObjectId.createFromHexString(campaignId) },
      {
          $inc: { opened: 1 },
          $push: { openedRecipients: trackingId },
          $set: { updatedAt: new Date() },
      }
  );

  if (result.modifiedCount > 0) {
      console.log(`Campaign ${campaignId} updated successfully with new open count.`);
  } else {
      console.log(`No campaign found with ID: ${campaignId}`);
  }
  return result;
}


async function updateCampaignStats(campaignId, stats) {
  const db = await connectToDatabase();

  const { totalSent, totalDelivered } = stats;

  const result = await db.collection('Campaign').updateOne(
    { _id:ObjectId.createFromHexString(campaignId) },
    {
      $set: {
        sent: totalSent,
        delivered: totalDelivered,
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
  return result
}

async function getTrackingDataByIds(trackingIds) {
  const db = await connectToDatabase();
  return db
    .collection('Trackings')
    .find({ trackingId: { $in: trackingIds } })
    .toArray();
}

module.exports = {
  getCampaignById,
  updateCampaignStats,
  getTrackingDataByIds,
  updateOpenedCount
};
