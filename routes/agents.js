/**
 * Routes pour déclencher les agents IA manuellement depuis le dashboard.
 * Toutes les routes nécessitent une authentification admin.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { runCRMAgent } = require('../agents/crmAgent');
const { runFinanceAgent } = require('../agents/financeAgent');
const { runContentAgent } = require('../agents/contentAgent');
const { runNewsletterAgent } = require('../agents/newsletterAgent');
const { runPortfolioAgent } = require('../agents/portfolioAgent');
const { runSEOAgent } = require('../agents/seoAgent');
const { runReportsAgent } = require('../agents/reportsAgent');

const AGENTS = {
  crm: runCRMAgent,
  finance: runFinanceAgent,
  content: runContentAgent,
  newsletter: runNewsletterAgent,
  portfolio: runPortfolioAgent,
  seo: runSEOAgent,
  reports: runReportsAgent,
};

// GET /api/agents — liste des agents disponibles avec leur statut
router.get('/', protect, (req, res) => {
  res.json({
    agents: [
      { id: 'crm', name: 'Agent CRM', description: 'Traite les nouveaux contacts et envoie des réponses', schedule: 'Toutes les 2h' },
      { id: 'finance', name: 'Agent Finance', description: 'Relance les factures impayées', schedule: 'Tous les jours à 9h' },
      { id: 'content', name: 'Agent Contenu', description: 'Génère et publie un article de blog', schedule: 'Lundis à 8h' },
      { id: 'newsletter', name: 'Agent Newsletter', description: 'Génère et envoie la newsletter', schedule: 'Vendredis à 10h' },
      { id: 'portfolio', name: 'Agent Portfolio', description: 'Génère des posts réseaux sociaux', schedule: 'Mercredis à 11h' },
      { id: 'seo', name: 'Agent SEO', description: 'Analyse SEO et génère des recommandations', schedule: 'Dimanches à 7h' },
      { id: 'reports', name: 'Agent Rapports', description: 'Génère le rapport business hebdomadaire', schedule: 'Lundis à 7h30' },
    ],
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
});

// POST /api/agents/:agentId/run — déclencher un agent manuellement
router.post('/:agentId/run', protect, async (req, res) => {
  const { agentId } = req.params;
  const agentFn = AGENTS[agentId];

  if (!agentFn) {
    return res.status(404).json({ message: `Agent "${agentId}" introuvable.` });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'ANTHROPIC_API_KEY non configurée. Ajoutez-la dans votre .env.' });
  }

  try {
    // Lancer l'agent en arrière-plan pour ne pas bloquer la réponse HTTP
    agentFn()
      .then(result => console.log(`[AGENTS ROUTE] ${agentId} terminé :`, result))
      .catch(err => console.error(`[AGENTS ROUTE] ${agentId} erreur :`, err.message));

    res.json({ message: `Agent "${agentId}" lancé en arrière-plan.`, status: 'running' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
