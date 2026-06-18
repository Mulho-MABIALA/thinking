/**
 * Agent Contenu & Blog
 * Génère automatiquement un article de blog FR + EN via Claude
 * et le publie dans la collection News.
 * Planification : tous les lundis à 8h00
 */

const Anthropic = require('@anthropic-ai/sdk');
const News = require('../models/News');
const { logAgentAction } = require('./utils');

const TOPICS = [
  "Les tendances de l'intelligence artificielle en Afrique",
  "Comment créer un site web professionnel en 2025",
  "L'importance du marketing digital pour les PME africaines",
  "Les meilleures pratiques de cybersécurité pour les entreprises",
  "Transformation digitale : par où commencer ?",
  "E-commerce en Afrique : opportunités et défis",
  "SEO pour les entreprises locales : stratégies efficaces",
  "Les outils no-code qui révolutionnent le développement",
  "Comment automatiser son business avec l'IA",
  "L'essor des applications mobiles en Afrique subsaharienne",
];

const DEFAULT_IMAGE = 'https://res.cloudinary.com/degva9sqr/image/upload/v1/thinking-tech/default-blog.jpg';

async function runContentAgent() {
  console.log('[AGENT CONTENU] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Choisir un sujet aléatoire parmi ceux non encore couverts récemment
  const recentNews = await News.find().sort({ createdAt: -1 }).limit(10).select('title');
  const recentTitles = recentNews.map(n => n.title.toLowerCase());
  const availableTopics = TOPICS.filter(t =>
    !recentTitles.some(rt => rt.includes(t.split(' ')[3]?.toLowerCase() || ''))
  );
  const topic = availableTopics.length > 0
    ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
    : TOPICS[Math.floor(Math.random() * TOPICS.length)];

  console.log(`[AGENT CONTENU] Sujet choisi : ${topic}`);

  const prompt = `Tu es un expert en marketing digital et technologie pour les entreprises africaines.
Génère un article de blog professionnel sur le sujet : "${topic}"

Retourne UNIQUEMENT un JSON valide avec cette structure exacte (sans markdown autour) :
{
  "title": "Titre accrocheur en français (max 80 caractères)",
  "category": "une parmi : Technologie, Marketing, Business, Innovation, IA, Développement",
  "excerpt": "Résumé de 2-3 phrases captivantes en français",
  "content": "Article complet en HTML (balises <h2>, <p>, <ul>, <strong>) d'au moins 600 mots en français",
  "author": "Thinking Tech"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  // Extraire le JSON même si Claude ajoute des backticks
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse Claude invalide : pas de JSON trouvé');

  const article = JSON.parse(jsonMatch[0]);

  const news = await News.create({
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    content: article.content,
    image: DEFAULT_IMAGE,
    author: article.author || 'Thinking Tech',
    published: true,
  });

  await logAgentAction('news', news._id, news.title, `Article généré automatiquement sur : ${topic}`);

  console.log(`[AGENT CONTENU] Article publié : "${news.title}" (ID: ${news._id})`);
  return { success: true, article: news };
}

module.exports = { runContentAgent };
