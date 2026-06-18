/**
 * Agent CRM / Contacts
 * Lit les nouveaux contacts (statut "nouveau"), les classe via Claude
 * et envoie une réponse email personnalisée.
 * Planification : toutes les 2 heures
 */

const Anthropic = require('@anthropic-ai/sdk');
const Contact = require('../models/Contact');
const { sendEmail, logAgentAction, todayFR } = require('./utils');

async function runCRMAgent() {
  console.log('[AGENT CRM] Démarrage...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Contacts nouveaux non lus
  const newContacts = await Contact.find({
    status: 'nouveau',
    deletedAt: null,
    readAt: null,
  }).sort({ createdAt: -1 }).limit(20);

  if (newContacts.length === 0) {
    console.log('[AGENT CRM] Aucun nouveau contact à traiter.');
    return { success: true, processed: 0 };
  }

  console.log(`[AGENT CRM] ${newContacts.length} nouveau(x) contact(s) à traiter.`);

  let processed = 0;

  for (const contact of newContacts) {
    const prompt = `Tu es un assistant commercial pour "Thinking Tech", une agence digitale africaine spécialisée en développement web, applications mobiles et marketing digital.

Analyse cette demande client et génère une réponse email professionnelle.

Demande :
- Nom : ${contact.name}
- Email : ${contact.email}
- Type de projet : ${contact.projectType}
- Description : ${contact.description}

Instructions :
1. Classifie ce prospect : "chaud" (besoin clair, projet défini), "froid" (vague, exploratoire) ou "spam" (sans intérêt commercial)
2. Si "spam", retourne action "ignorer"
3. Sinon, génère un email de réponse chaleureux et professionnel en français

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "classification": "chaud" | "froid" | "spam",
  "action": "repondre" | "ignorer",
  "subject": "Objet de l'email de réponse",
  "html": "Email HTML complet avec styles inline — remercier, reformuler leur besoin, proposer un appel découverte, signer 'L'équipe Thinking Tech'"
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

      const result = JSON.parse(jsonMatch[0]);

      // Marquer comme lu
      await Contact.findByIdAndUpdate(contact._id, {
        readAt: new Date(),
        status: result.classification === 'spam' ? 'archivé' : 'en_cours',
        notes: `[Agent IA] Classification : ${result.classification} — ${todayFR()}`,
      });

      if (result.action === 'repondre' && result.html) {
        await sendEmail({
          to: contact.email,
          subject: result.subject,
          html: result.html,
        });
        console.log(`[AGENT CRM] Réponse envoyée à ${contact.email} (${result.classification})`);
      } else {
        console.log(`[AGENT CRM] Contact ${contact.email} classifié comme spam — archivé.`);
      }

      await logAgentAction(
        'contact',
        contact._id,
        contact.name,
        `Classification: ${result.classification} — Action: ${result.action}`,
        'update'
      );

      processed++;
    } catch (e) {
      console.error(`[AGENT CRM] Erreur pour ${contact.email}:`, e.message);
    }
  }

  return { success: true, processed };
}

module.exports = { runCRMAgent };
