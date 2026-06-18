/**
 * Scheduler des agents IA
 * Utilise node-cron pour planifier l'exécution automatique de chaque agent.
 *
 * Planifications :
 *  - CRM          : toutes les 2h
 *  - Finance      : tous les jours à 9h00
 *  - Contenu      : tous les lundis à 8h00
 *  - Newsletter   : tous les vendredis à 10h00
 *  - Portfolio    : tous les mercredis à 11h00
 *  - SEO          : tous les dimanches à 7h00
 *  - Rapports     : tous les lundis à 7h30
 */

const cron = require('node-cron');
const { runCRMAgent } = require('./crmAgent');
const { runFinanceAgent } = require('./financeAgent');
const { runContentAgent } = require('./contentAgent');
const { runNewsletterAgent } = require('./newsletterAgent');
const { runPortfolioAgent } = require('./portfolioAgent');
const { runSEOAgent } = require('./seoAgent');
const { runReportsAgent } = require('./reportsAgent');

function safeRun(name, fn) {
  return async () => {
    console.log(`\n[SCHEDULER] ▶ Démarrage agent : ${name}`);
    try {
      const result = await fn();
      console.log(`[SCHEDULER] ✓ ${name} terminé :`, result);
    } catch (err) {
      console.error(`[SCHEDULER] ✗ ${name} erreur :`, err.message);
    }
  };
}

function startScheduler() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[SCHEDULER] ⚠ ANTHROPIC_API_KEY manquant — agents désactivés.');
    return;
  }

  // CRM : toutes les 2 heures
  cron.schedule('0 */2 * * *', safeRun('CRM', runCRMAgent));

  // Finance : tous les jours à 9h00
  cron.schedule('0 9 * * *', safeRun('Finance', runFinanceAgent));

  // Contenu : tous les lundis à 8h00
  cron.schedule('0 8 * * 1', safeRun('Contenu', runContentAgent));

  // Newsletter : tous les vendredis à 10h00
  cron.schedule('0 10 * * 5', safeRun('Newsletter', runNewsletterAgent));

  // Portfolio : tous les mercredis à 11h00
  cron.schedule('0 11 * * 3', safeRun('Portfolio', runPortfolioAgent));

  // SEO : tous les dimanches à 7h00
  cron.schedule('0 7 * * 0', safeRun('SEO', runSEOAgent));

  // Rapports : tous les lundis à 7h30
  cron.schedule('30 7 * * 1', safeRun('Rapports', runReportsAgent));

  console.log('[SCHEDULER] ✅ Tous les agents IA planifiés et actifs.');
}

module.exports = { startScheduler };
