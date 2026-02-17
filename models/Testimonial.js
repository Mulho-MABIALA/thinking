const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  image: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
