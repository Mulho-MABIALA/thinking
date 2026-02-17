const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Thinking Tech' },
  siteTagline: { type: String, default: 'Red Edition' },
  email: { type: String, default: 'pro@thinkingtech.com' },
  phone: { type: String, default: '' },
  address: { type: String, default: 'Tech City Hub, Innovation Ave 123' },
  social: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  description: { type: String, default: 'Nous concevons des applications numériques premium pour les leaders de demain.' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
