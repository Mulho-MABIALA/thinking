/**
 * Agent Portfolio & Réseaux Sociaux
 * Lit les nouveaux projets portfolio et génère des posts
 * pour LinkedIn, Instagram et X — sauvegardés en rapport.
 * Planification : tous les mercredis à 11h00
 */

const Anthropic = require('@anthropic-ai/sdk');
const Portfolio = require('../models/Portfolio');
const Report = require('../models/Report');
const { sendEmail, logAgentAction, todayFR } = require('./utils');

async function runPortfolioAgent() {
  console.log('[AGENT PORTFOLIO] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Projets ajoutés dans les 7 derniers jours
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newProjects = await Portfolio.find({ createdAt: { $gte: weekAgo } })
    .select('title category problem solution result technologies liveUrl');

  if (newProjects.length === 0) {
    console.log('[AGENT PORTFOLIO] Aucun nouveau projet cette semaine.');
    return { success: true, processed: 0 };
  }

  console.log(`[AGENT PORTFOLIO] ${newProjects.length} nouveau(x) projet(s) à traiter.`);

  const posts = [];

  for (const project of newProjects) {
    const techList = project.technologies?.join(', ') || 'technologies modernes';

    const prompt = `Tu es un expert en marketing digital pour une agence web africaine "Thinking Tech / Zolaa".
Génère des posts réseaux sociaux percutants pour présenter ce projet.

Projet :
- Titre : ${project.title}
- Catégorie : ${project.category}
- Problème résolu : ${project.problem || 'Non spécifié'}
- Solution apportée : ${project.solution || 'Non spécifié'}
- Résultat : ${project.result || 'Non spécifié'}
- Technologies : ${techList}
${project.liveUrl ? `- URL : ${project.liveUrl}` : ''}

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "linkedin": "Post LinkedIn professionnel (200-300 mots), storytelling, emojis sobres, hashtags pertinents, appel à l'action",
  "instagram": "Caption Instagram engageant (100-150 mots), emojis expressifs, hashtags populaires #tech #africa #digital",
  "twitter": "Tweet court et percutant (max 280 caractères), hashtags, mention @zolaatech"
}`;

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = message.content[0].text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON introuvable');

      const postData = JSON.parse(jsonMatch[0]);
      posts.push({ project: project.title, ...postData });

      console.log(`[AGENT PORTFOLIO] Posts générés pour "${project.title}"`);
    } catch (e) {
      console.error(`[AGENT PORTFOLIO] Erreur pour "${project.title}":`, e.message);
    }
  }

  if (posts.length === 0) return { success: false, processed: 0 };

  // Sauvegarder en rapport
  const contentMD = posts.map(p => `
## ${p.project}

### LinkedIn
${p.linkedin}

### Instagram
${p.instagram}

### Twitter / X
${p.twitter}
---`).join('\n');

  const now = new Date();
  const report = await Report.create({
    title: `Posts Réseaux Sociaux — ${todayFR()}`,
    type: 'commercial',
    period: 'hebdomadaire',
    dateFrom: weekAgo,
    dateTo: now,
    status: 'publié',
    summary: `${posts.length} post(s) générés pour ${newProjects.length} projet(s) portfolio`,
    content: contentMD,
    metrics: new Map([
      ['projetsTraités', newProjects.length],
      ['postsGénérés', posts.length * 3],
    ]),
    tags: ['réseaux-sociaux', 'portfolio', 'automatique', 'agent-ia'],
    createdBy: 'Agent IA',
  });

  // Envoyer les posts par email à l'admin pour validation
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@zolaa.tech';
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">📢 Posts Réseaux Sociaux — ${todayFR()}</h2>
      <p>${posts.length} post(s) générés pour vos nouveaux projets. Copiez-collez pour publier !</p>
      ${posts.map(p => `
        <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #6366f1; margin-top: 0;">🗂 ${p.project}</h3>
          <h4>LinkedIn</h4><p style="background:#f9f9f9;padding:12px;border-radius:4px;white-space:pre-wrap;">${p.linkedin}</p>
          <h4>Instagram</h4><p style="background:#f9f9f9;padding:12px;border-radius:4px;white-space:pre-wrap;">${p.instagram}</p>
          <h4>Twitter / X</h4><p style="background:#f9f9f9;padding:12px;border-radius:4px;white-space:pre-wrap;">${p.twitter}</p>
        </div>
      `).join('')}
    </div>`;

  await sendEmail({
    to: adminEmail,
    subject: `📢 Posts réseaux sociaux prêts — ${posts.length} projet(s)`,
    html: emailHtml,
  });

  await logAgentAction('contact', report._id, report.title,
    `${posts.length} posts générés et envoyés à ${adminEmail}`, 'create');

  return { success: true, processed: posts.length, reportId: report._id };
}

module.exports = { runPortfolioAgent };
