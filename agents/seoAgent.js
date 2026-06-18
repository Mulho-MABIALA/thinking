/**
 * Agent SEO
 * Analyse les derniers articles et génère des suggestions SEO
 * (balises meta, mots-clés) sauvegardées en rapport.
 * Planification : tous les dimanches à 7h00
 */

const Anthropic = require('@anthropic-ai/sdk');
const News = require('../models/News');
const Report = require('../models/Report');
const { logAgentAction, todayFR } = require('./utils');

async function runSEOAgent() {
  console.log('[AGENT SEO] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Analyser les 5 derniers articles publiés
  const articles = await News.find({ published: true }).sort({ createdAt: -1 }).limit(5);
  if (articles.length === 0) {
    console.log('[AGENT SEO] Aucun article à analyser.');
    return { success: true, processed: 0 };
  }

  const articlesList = articles.map((a, i) =>
    `${i + 1}. Titre: "${a.title}" | Catégorie: ${a.category} | Extrait: ${a.excerpt}`
  ).join('\n');

  const prompt = `Tu es un expert SEO spécialisé dans les sites web d'agences digitales africaines.
Analyse ces articles de blog et génère des recommandations SEO complètes.

Articles :
${articlesList}

Site : zolaa.tech — agence web & marketing digital en Afrique

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "globalKeywords": ["mot-clé 1", "mot-clé 2", "..."] (10 mots-clés prioritaires pour le site),
  "articlesSEO": [
    {
      "title": "titre original de l'article",
      "metaTitle": "balise title optimisée (max 60 caractères)",
      "metaDescription": "meta description optimisée (max 155 caractères)",
      "keywords": ["kw1", "kw2", "kw3"],
      "suggestion": "amélioration principale suggérée en 1 phrase"
    }
  ],
  "globalSuggestions": ["suggestion globale 1", "suggestion globale 2", "suggestion globale 3"],
  "priorityScore": "faible | moyen | élevé"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON introuvable dans la réponse SEO');

  const seoData = JSON.parse(jsonMatch[0]);

  const content = `## Rapport SEO — ${todayFR()}

### Mots-clés prioritaires
${seoData.globalKeywords.map(k => `- ${k}`).join('\n')}

### Analyse par article
${seoData.articlesSEO.map(a => `
**${a.title}**
- Meta Title : ${a.metaTitle}
- Meta Description : ${a.metaDescription}
- Mots-clés : ${a.keywords.join(', ')}
- Suggestion : ${a.suggestion}
`).join('\n')}

### Recommandations globales
${seoData.globalSuggestions.map(s => `- ${s}`).join('\n')}

**Score de priorité : ${seoData.priorityScore}**`;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const report = await Report.create({
    title: `Rapport SEO — ${todayFR()}`,
    type: 'activité',
    period: 'hebdomadaire',
    dateFrom: weekAgo,
    dateTo: now,
    status: 'publié',
    summary: `Analyse SEO de ${articles.length} articles. Priorité : ${seoData.priorityScore}`,
    content,
    metrics: new Map([
      ['articlesAnalysés', articles.length],
      ['motsClésPrioritaires', seoData.globalKeywords.length],
      ['scoreGlobal', seoData.priorityScore],
    ]),
    tags: ['seo', 'automatique', 'agent-ia'],
    createdBy: 'Agent IA',
  });

  await logAgentAction('contact', report._id, report.title,
    `Rapport SEO généré pour ${articles.length} articles`, 'create');

  console.log(`[AGENT SEO] Rapport SEO créé (ID: ${report._id})`);
  return { success: true, reportId: report._id, articlesAnalyzed: articles.length };
}

module.exports = { runSEOAgent };
