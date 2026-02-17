const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    trim: true
  },
  excerpt: {
    type: String,
    required: [true, "L'extrait est requis"]
  },
  content: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: [true, "L'image est requise"]
  },
  author: {
    type: String,
    default: 'Thinking Tech'
  },
  published: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);
