const mongoose = require('mongoose');

const newsletterCampaignSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Sujet requis'],
      trim: true,
      maxlength: [200, 'Sujet trop long'],
    },
    content: {
      type: String,
      required: [true, 'Contenu requis'],
    },
    sentTo: {
      type: Number,
      default: 0,
    },
    sentSuccess: {
      type: Number,
      default: 0,
    },
    sentFailed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'failed'],
      default: 'sending',
    },
    sentBy: {
      type: String,
      default: 'Admin',
    },
  },
  { timestamps: true }
);

newsletterCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NewsletterCampaign', newsletterCampaignSchema);
