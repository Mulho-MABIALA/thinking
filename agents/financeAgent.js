/**
 * Agent Finance & Relance
 * Détecte les factures en retard et envoie des emails de relance personnalisés.
 * Planification : tous les jours à 9h00
 */

const Anthropic = require('@anthropic-ai/sdk');
const Invoice = require('../models/Invoice');
const { sendEmail, logAgentAction, formatAmount, todayFR } = require('./utils');

const SITE_URL = process.env.FRONTEND_URL || 'https://zolaa.tech';

async function runFinanceAgent() {
  console.log('[AGENT FINANCE] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const now = new Date();

  // Factures en attente avec date d'échéance dépassée et non supprimées
  const overdueInvoices = await Invoice.find({
    status: 'en_attente',
    dueDate: { $lt: now },
    deletedAt: null,
  }).select('number clientName clientEmail total currency dueDate items notes');

  if (overdueInvoices.length === 0) {
    await logAgentAction('agent', 'finance', 'Agent Finance', 'Aucune facture en retard — tout est à jour.');
    console.log('[AGENT FINANCE] Aucune facture en retard.');
    return { success: true, processed: 0 };
  }

  console.log(`[AGENT FINANCE] ${overdueInvoices.length} facture(s) en retard trouvée(s).`);

  let processed = 0;

  for (const invoice of overdueInvoices) {
    const daysOverdue = Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24));
    const amount = formatAmount(invoice.total, invoice.currency);

    const prompt = `Tu es un assistant facturation pour une agence web africaine "Thinking Tech".
Génère un email de relance professionnel et courtois en français pour une facture impayée.

Informations :
- Client : ${invoice.clientName}
- Numéro facture : ${invoice.number}
- Montant : ${amount}
- Échéance dépassée de : ${daysOverdue} jour(s)
- Date d'aujourd'hui : ${todayFR()}

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "subject": "Objet de l'email (mentionner le numéro de facture)",
  "html": "Email HTML complet avec styles inline, ton professionnel mais bienveillant, rappel du montant dû, invitation à régulariser, coordonnées de contact support@zolaa.tech"
}`;

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = message.content[0].text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON introuvable dans la réponse');

      const { subject, html } = JSON.parse(jsonMatch[0]);

      await sendEmail({ to: invoice.clientEmail, subject, html });

      await logAgentAction('invoice', invoice._id, invoice.number,
        `Relance automatique envoyée à ${invoice.clientEmail} — retard de ${daysOverdue} jour(s)`);

      console.log(`[AGENT FINANCE] Relance envoyée pour ${invoice.number} à ${invoice.clientEmail}`);
      processed++;
    } catch (e) {
      console.error(`[AGENT FINANCE] Erreur pour ${invoice.number}:`, e.message);
    }
  }

  return { success: true, processed };
}

module.exports = { runFinanceAgent };
