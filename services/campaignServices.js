// services/campaignService.js
const connectToDatabase = require('../db');

async function getCampaignById(campaignId) {
  const db = await connectToDatabase();
  return db.collection('Campaigns').findOne({ _id: campaignId });
}

async function updateCampaignStats(campaignId, stats) {
  const db = await connectToDatabase();

  const { totalOpened, totalClicks, uniqueOpens } = stats;

  return db.collection('Campaigns').updateOne(
    { _id: campaignId },
    {
      $set: {
        opened: totalOpened,
        clicked: totalClicks,
        uniqueOpens: uniqueOpens,
        updatedAt: new Date(),
      },
    }
  );
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
};
