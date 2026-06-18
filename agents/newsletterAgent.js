/**
 * Agent Newsletter
 * Lit les 3 derniers articles, génère un email HTML via Claude,
 * envoie à tous les abonnés actifs et crée la campagne en base.
 * Planification : tous les vendredis à 10h00
 */

const Anthropic = require('@anthropic-ai/sdk');
const Newsletter = require('../models/Newsletter');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const News = require('../models/News');
const { sendEmail, logAgentAction, todayFR } = require('./utils');

const SITE_URL = process.env.FRONTEND_URL || 'https://zolaa.tech';

async function runNewsletterAgent() {
  console.log('[AGENT NEWSLETTER] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Récupérer les 3 derniers articles publiés
  const articles = await News.find({ published: true }).sort({ createdAt: -1 }).limit(3);
  if (articles.length === 0) {
    console.log('[AGENT NEWSLETTER] Aucun article trouvé, abandon.');
    return { success: false, reason: 'Aucun article disponible' };
  }

  // Récupérer les abonnés actifs
  const subscribers = await Newsletter.find({ status: 'active' }).select('email');
  if (subscribers.length === 0) {
    console.log('[AGENT NEWSLETTER] Aucun abonné actif, abandon.');
    return { success: false, reason: 'Aucun abonné actif' };
  }

  const articlesSummary = articles.map((a, i) =>
    `${i + 1}. "${a.title}" — ${a.excerpt} (Catégorie: ${a.category})`
  ).join('\n');

  const prompt = `Tu es un expert en email marketing pour une agence tech africaine appelée "Thinking Tech" (aussi connue sous Zolaa).
Génère un email newsletter HTML professionnel et engageant en français.

Articles à mettre en avant :
${articlesSummary}

URL du site : ${SITE_URL}

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "subject": "Objet de l'email accrocheur (max 60 caractères, peut inclure un emoji)",
  "html": "Email complet en HTML avec styles inline, couleurs #6366f1 (violet) et blanc, sections pour chaque article avec titre + extrait + bouton 'Lire la suite', header avec logo texte THINKING TECH, footer avec lien désinscription"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Claude invalide');

  const { subject, html } = JSON.parse(jsonMatch[0]);

  // Créer la campagne en base avec statut "sending"
  const campaign = await NewsletterCampaign.create({
    subject,
    content: html,
    sentTo: subscribers.length,
    sentSuccess: 0,
    sentFailed: 0,
    status: 'sending',
    sentBy: 'Agent IA',
  });

  // Envoyer les emails
  let success = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEmail({ to: subscriber.email, subject, html });
      success++;
    } catch (e) {
      console.error(`[AGENT NEWSLETTER] Échec envoi à ${subscriber.email}:`, e.message);
      failed++;
    }
  }

  // Mettre à jour la campagne
  await NewsletterCampaign.findByIdAndUpdate(campaign._id, {
    sentSuccess: success,
    sentFailed: failed,
    status: failed > success ? 'failed' : 'sent',
  });

  await logAgentAction('contact', campaign._id, subject,
    `Newsletter envoyée à ${success}/${subscribers.length} abonnés`);

  console.log(`[AGENT NEWSLETTER] Campagne "${subject}" : ${success} succès, ${failed} échecs`);
  return { success: true, campaignId: campaign._id, sent: success, failed };
}

module.exports = { runNewsletterAgent };
