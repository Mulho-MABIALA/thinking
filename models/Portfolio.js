const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
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
  image: {
    type: String,
    required: [true, "L'image est requise"]
  },
  problem: {
    type: String,
    required: [true, 'La problématique est requise']
  },
  solution: {
    type: String,
    required: [true, 'La solution est requise']
  },
  result: {
    type: String,
    required: [true, 'Le résultat est requis']
  },
  technologies: [{
    type: String
  }],
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
