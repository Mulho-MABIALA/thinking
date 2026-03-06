/**
 * Script de migration one-time
 * Crée une entrée Finance pour chaque facture déjà marquée "payé"
 * qui n'en a pas encore une.
 *
 * Usage : node scripts/backfill-finance-invoices.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Finance = require('../models/Finance');

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connecté à MongoDB');

  // Toutes les factures payées et non supprimées
  const paidInvoices = await Invoice.find({ status: 'payé', deletedAt: null });
  console.log(`📄 ${paidInvoices.length} facture(s) payée(s) trouvée(s)`);

  let created = 0;
  let skipped = 0;

  for (const invoice of paidInvoices) {
    // Vérifie si une entrée Finance existe déjà pour cette facture
    const existing = await Finance.findOne({ invoice: invoice._id, deletedAt: null });

    if (existing) {
      console.log(`  ⏭️  Déjà présent : ${invoice.number} — ${invoice.clientName}`);
      skipped++;
      continue;
    }

    await Finance.create({
      type: 'entrée',
      category: 'Facture client',
      description: `Paiement facture ${invoice.number} — ${invoice.clientName}`,
      amount: invoice.total,
      currency: invoice.currency || 'XOF',
      date: invoice.paidAt || invoice.updatedAt || new Date(),
      paymentMethod: 'virement',
      reference: invoice.number,
      contact: invoice.contact || null,
      invoice: invoice._id,
      notes: `Entrée importée rétroactivement depuis la facture ${invoice.number}`,
    });

    console.log(`  ✅ Créé : ${invoice.number} — ${invoice.clientName} → ${invoice.total} ${invoice.currency || 'XOF'}`);
    created++;
  }

  console.log(`\n🎉 Migration terminée : ${created} entrée(s) créée(s), ${skipped} ignorée(s) (déjà existantes)`);
  await mongoose.disconnect();
  process.exit(0);
}

backfill().catch(err => {
  console.error('❌ Erreur migration :', err);
  process.exit(1);
});
