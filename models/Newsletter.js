const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email requis'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide'],
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Index for fast lookups (email index already created by unique:true)
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
