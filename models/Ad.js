const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Titre requis'],
      trim: true,
    },
    advertiser: {
      type: String,
      required: [true, 'Nom de l\'annonceur requis'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Image requise'],
    },
    linkUrl: {
      type: String,
      required: [true, 'Lien de destination requis'],
    },
    position: {
      type: String,
      enum: ['home', 'blog', 'services', 'global'],
      default: 'home',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'FCFA',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

adSchema.index({ position: 1, isActive: 1 });
adSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ad', adSchema);
