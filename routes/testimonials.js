const express = require('express');
const Testimonial = require('../models/Testimonial');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/testimonials - Lister les témoignages (published only pour public, tous pour admin)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.published === 'true' ? { published: true } : {};
    const testimonials = await Testimonial.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/testimonials/submit - Soumission publique (sans auth, pending review)
router.post('/submit', async (req, res) => {
  try {
    const { name, role, company, content, rating } = req.body;
    if (!name || !role || !company || !content) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }
    const testimonial = await Testimonial.create({
      name, role, company, content,
      rating: rating || 5,
      published: false, // en attente de validation admin
      image: ''
    });
    res.status(201).json({ message: 'Témoignage soumis avec succès, en attente de validation.', testimonial });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/testimonials - Créer un témoignage (admin)
router.post('/', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/testimonials/:id - Mettre à jour (admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!testimonial) return res.status(404).json({ message: 'Témoignage non trouvé' });
    res.json(testimonial);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/testimonials/:id - Supprimer (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Témoignage non trouvé' });
    res.json({ message: 'Témoignage supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
