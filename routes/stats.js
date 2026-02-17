const express = require('express');
const Contact = require('../models/Contact');
const Portfolio = require('../models/Portfolio');
const Team = require('../models/Team');
const News = require('../models/News');
const Service = require('../models/Service');
const Testimonial = require('../models/Testimonial');
const FAQ = require('../models/FAQ');
const Partner = require('../models/Partner');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Finance = require('../models/Finance');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalContacts, newContacts, inProgressContacts, treatedContacts,
      totalProjects, totalMembers, totalNews, totalServices,
      totalTestimonials, totalFAQ, totalPartners,
      totalContracts, signedContracts, pendingContracts,
      totalInvoices, paidInvoices, pendingInvoices,
      recentContacts
    ] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'nouveau' }),
      Contact.countDocuments({ status: 'en_cours' }),
      Contact.countDocuments({ status: 'traité' }),
      Portfolio.countDocuments(),
      Team.countDocuments(),
      News.countDocuments(),
      Service.countDocuments(),
      Testimonial.countDocuments({ published: true }),
      FAQ.countDocuments(),
      Partner.countDocuments(),
      Contract.countDocuments(),
      Contract.countDocuments({ status: 'signé' }),
      Contract.countDocuments({ status: { $in: ['brouillon', 'envoyé'] } }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'payé' }),
      Invoice.countDocuments({ status: 'en_attente' }),
      Contact.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ]);

    // Finance annuelle
    const [financeEntrees, financeSorties] = await Promise.all([
      Finance.aggregate([
        { $match: { type: 'entrée', date: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { type: 'sortie', date: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Montant factures en attente
    const invoicePendingAmount = await Invoice.aggregate([
      { $match: { status: 'en_attente' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Contacts par type de projet
    const contactsByType = await Contact.aggregate([
      { $group: { _id: '$projectType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Contacts par mois (6 derniers mois)
    const contactsByMonth = await Contact.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Derniers contacts
    const recentContactsList = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email projectType status createdAt');

    const totalEntrees = financeEntrees[0]?.total || 0;
    const totalSorties = financeSorties[0]?.total || 0;

    res.json({
      // Contacts
      totalContacts, newContacts, inProgressContacts, treatedContacts, recentContacts,
      // Contenu
      totalProjects, totalMembers, totalNews, totalServices,
      totalTestimonials, totalFAQ, totalPartners,
      // Business
      totalContracts, signedContracts, pendingContracts,
      totalInvoices, paidInvoices, pendingInvoices,
      pendingInvoicesAmount: invoicePendingAmount[0]?.total || 0,
      // Finance
      totalEntrees, totalSorties,
      soldeNet: totalEntrees - totalSorties,
      // Graphiques
      contactsByType, contactsByMonth,
      recentContactsList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
