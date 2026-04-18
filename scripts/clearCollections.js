require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Contact  = require('../models/Contact');
const Contract = require('../models/Contract');
const Invoice  = require('../models/Invoice');
const Finance  = require('../models/Finance');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const [c1, c2, c3, c4] = await Promise.all([
      Contact.deleteMany({}),
      Contract.deleteMany({}),
      Invoice.deleteMany({}),
      Finance.deleteMany({}),
    ]);

    console.log(`🗑  Contacts  supprimés : ${c1.deletedCount}`);
    console.log(`🗑  Contrats  supprimés : ${c2.deletedCount}`);
    console.log(`🗑  Factures  supprimées: ${c3.deletedCount}`);
    console.log(`🗑  Finances  supprimées: ${c4.deletedCount}`);
    console.log('✅ Terminé.');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
