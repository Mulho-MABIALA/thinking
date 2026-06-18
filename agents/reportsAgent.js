/**
 * Agent Rapports
 * Agrège les stats hebdomadaires (contacts, factures, finance)
 * et génère un rapport business + l'envoie par email à l'admin.
 * Planification : tous les lundis à 7h30
 */

const Anthropic = require('@anthropic-ai/sdk');
const Contact = require('../models/Contact');
const Invoice = require('../models/Invoice');
const Finance = require('../models/Finance');
const Report = require('../models/Report');
const { sendEmail, logAgentAction, formatAmount, todayFR } = require('./utils');

async function runReportsAgent() {
  console.log('[AGENT RAPPORTS] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Agrégation des données de la semaine écoulée
  const [
    newContacts,
    totalContacts,
    weekInvoices,
    overdueInvoices,
    weekFinance,
  ] = await Promise.all([
    Contact.countDocuments({ createdAt: { $gte: weekAgo }, deletedAt: null }),
    Contact.countDocuments({ deletedAt: null }),
    Invoice.find({ createdAt: { $gte: weekAgo }, deletedAt: null }).select('total status currency'),
    Invoice.countDocuments({ status: 'en_attente', dueDate: { $lt: now }, deletedAt: null }),
    Finance.find({ date: { $gte: weekAgo } }).select('type amount description'),
  ]);

  const weekRevenue = weekInvoices
    .filter(i => i.status === 'payé')
    .reduce((sum, i) => sum + i.total, 0);

  const weekPending = weekInvoices
    .filter(i => i.status === 'en_attente')
    .reduce((sum, i) => sum + i.total, 0);

  const weekExpenses = weekFinance
    .filter(f => f.type === 'sortie')
    .reduce((sum, f) => sum + f.amount, 0);

  const weekIncome = weekFinance
    .filter(f => f.type === 'entrée')
    .reduce((sum, f) => sum + f.amount, 0);

  const statsText = `
Données de la semaine du ${weekAgo.toLocaleDateString('fr-FR')} au ${now.toLocaleDateString('fr-FR')} :
- Nouveaux contacts : ${newContacts} (total: ${totalContacts})
- Factures créées cette semaine : ${weekInvoices.length}
- Revenus facturés (payé) : ${formatAmount(weekRevenue)}
- Montant en attente : ${formatAmount(weekPending)}
- Factures en retard (toutes périodes) : ${overdueInvoices}
- Entrées financières : ${formatAmount(weekIncome)}
- Dépenses : ${formatAmount(weekExpenses)}
- Solde net semaine : ${formatAmount(weekIncome - weekExpenses)}
`;

  const prompt = `Tu es un analyste business pour "Thinking Tech", une agence digitale africaine.
Génère un rapport hebdomadaire professionnel en français basé sur ces données.

${statsText}

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "title": "Titre du rapport hebdomadaire",
  "summary": "Résumé exécutif en 2-3 phrases",
  "content": "Rapport complet en Markdown avec sections : Vue d'ensemble, Points forts, Points d'attention, Recommandations pour la semaine",
  "emailHtml": "Version email HTML du rapport avec styles inline, résumé des KPIs dans des cartes colorées, couleur principale #6366f1"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON introuvable');

  const { title, summary, content, emailHtml } = JSON.parse(jsonMatch[0]);

  // Sauvegarder le rapport
  const report = await Report.create({
    title,
    type: 'financier',
    period: 'hebdomadaire',
    dateFrom: weekAgo,
    dateTo: now,
    status: 'publié',
    summary,
    content,
    metrics: new Map([
      ['newContacts', newContacts],
      ['weekRevenue', weekRevenue],
      ['weekPending', weekPending],
      ['overdueInvoices', overdueInvoices],
      ['netBalance', weekIncome - weekExpenses],
    ]),
    tags: ['hebdomadaire', 'automatique', 'agent-ia', 'finance'],
    createdBy: 'Agent IA',
  });

  // Envoyer par email à l'admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@zolaa.tech';
  await sendEmail({
    to: adminEmail,
    subject: `📊 ${title} — ${todayFR()}`,
    html: emailHtml,
  });

  await logAgentAction('finance', report._id, title,
    `Rapport hebdomadaire généré et envoyé à ${adminEmail}`, 'create');

  console.log(`[AGENT RAPPORTS] Rapport créé et envoyé (ID: ${report._id})`);
  return { success: true, reportId: report._id };
}

module.exports = { runReportsAgent };
