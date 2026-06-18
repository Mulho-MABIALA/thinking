const { Resend } = require('resend');
const ActivityLog = require('../models/ActivityLog');

const getResend = () => new Resend(process.env.RESEND_API_KEY);

/**
 * Log une action agent dans ActivityLog.
 * entity/action sont limités par le schema — on utilise 'create'/'update' selon le cas.
 */
async function logAgentAction(entity, entityId, entityLabel, details, action = 'agent') {
  try {
    await ActivityLog.create({
      action: 'agent',
      entity: entity || 'agent',
      entityId: String(entityId),
      entityLabel,
      user: 'Agent IA',
      details,
    });
  } catch (e) {
    console.error('[AGENT LOG ERROR]', e.message);
  }
}

/**
 * Envoie un email via Resend.
 */
async function sendEmail({ to, subject, html }) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@zolaa.tech';
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

/**
 * Formate un montant en FCFA / XOF.
 */
function formatAmount(amount, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

/**
 * Retourne la date d'aujourd'hui formatée en français.
 */
function todayFR() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

module.exports = { logAgentAction, sendEmail, formatAmount, todayFR };
