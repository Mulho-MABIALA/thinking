/**
 * Script d'insertion des 3 articles SEO ciblant Dakar / Sénégal
 * Usage: node seedBlogSEO.js
 *
 * NE supprime PAS les articles existants — ajoute uniquement ces 3 articles.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

const articles = [
  {
    title: 'Pourquoi créer un site web au Sénégal en 2026 ?',
    category: 'Conseils',
    author: 'Zolaa Tech',
    published: true,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80',
    excerpt:
      "Le Sénégal connaît une croissance numérique sans précédent. Avoir un site web n'est plus un luxe — c'est une nécessité pour toute entreprise qui veut exister en ligne et attirer des clients.",
    content: `<h2>Le digital au Sénégal en 2026</h2>
<p>Avec plus de <strong>8 millions d'internautes</strong> et un taux de pénétration mobile dépassant 110 %, le Sénégal est l'un des marchés digitaux les plus dynamiques d'Afrique de l'Ouest.</p>
<p>Pourtant, la majorité des PME sénégalaises n'ont toujours pas de présence en ligne. C'est une opportunité immense pour ceux qui franchissent le pas aujourd'hui.</p>

<h2>5 raisons de créer votre site web maintenant</h2>

<h3>1. Vos clients vous cherchent sur Google</h3>
<p>Avant d'acheter un produit ou de contacter un prestataire, les Sénégalais font des recherches en ligne. Si vous n'apparaissez pas, c'est votre concurrent qui récupère ce client.</p>

<h3>2. Un site web est disponible 24h/24</h3>
<p>Contrairement à un magasin physique, votre site présente vos services, vos prix et vos contacts à toute heure — même pendant que vous dormez.</p>

<h3>3. La concurrence s'y met déjà</h3>
<p>Les entreprises qui investissent dans le digital aujourd'hui prendront une avance difficile à rattraper dans 2 ou 3 ans. Ne laissez pas cette avance à vos concurrents.</p>

<h3>4. Crédibilité et professionnalisme</h3>
<p>Un site bien conçu inspire confiance. Pour beaucoup de clients, une entreprise sans site web n'existe pas vraiment.</p>

<h3>5. Un investissement rentable</h3>
<p>Chez Zolaa Tech, un site vitrine commence à <strong>100 000 FCFA</strong>. Un seul nouveau client obtenu grâce à votre site rembourse souvent cet investissement.</p>

<h2>Par où commencer ?</h2>
<p>Contactez notre équipe à Dakar pour un <strong>devis gratuit</strong>. Nous vous accompagnons de la conception à la mise en ligne, avec formation incluse.</p>`,
  },
  {
    title: 'Combien coûte la création d\'un site web à Dakar ?',
    category: 'Tarifs',
    author: 'Zolaa Tech',
    published: true,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    excerpt:
      "La question que tout entrepreneur sénégalais se pose : quel budget prévoir pour un site web professionnel à Dakar ? Voici les vrais chiffres du marché en 2026.",
    content: `<h2>Les tarifs de création de site web à Dakar en 2026</h2>
<p>Le prix d'un site web varie énormément selon le type de projet, l'agence choisie et les fonctionnalités souhaitées. Voici un aperçu réaliste des tarifs pratiqués sur le marché sénégalais.</p>

<h2>Les différentes catégories de sites</h2>

<h3>Site Vitrine — à partir de 100 000 FCFA</h3>
<p>Idéal pour les artisans, professions libérales, petits commerces. Il présente votre activité, vos services et vos coordonnées. Simple, rapide à réaliser (7-14 jours) et efficace.</p>

<h3>Site Pro / Blog — à partir de 200 000 FCFA</h3>
<p>Pour les entreprises qui souhaitent un site complet avec blog, formulaire de devis personnalisé et optimisation SEO avancée. Livré en 2 à 4 semaines.</p>

<h3>E-Commerce — à partir de 350 000 FCFA</h3>
<p>Pour vendre en ligne avec intégration Wave, Orange Money et carte bancaire. Inclut gestion des produits, commandes et stocks.</p>

<h3>Application Web / Mobile — sur devis</h3>
<p>Plateformes SaaS, applications métier, marketplaces — les projets complexes font l'objet d'un devis personnalisé.</p>

<h2>Ce qui est inclus chez Zolaa Tech</h2>
<ul>
  <li>Design moderne et responsive (mobile-first)</li>
  <li>Hébergement première année inclus</li>
  <li>Optimisation SEO de base</li>
  <li>Formation à la gestion du contenu</li>
  <li>Support après livraison</li>
</ul>

<h2>Peut-on payer en plusieurs fois ?</h2>
<p>Oui. Nous proposons un paiement en 2 fois : 50 % à la commande, 50 % à la livraison. Pour les grands projets, un échelonnement en 3 fois est possible.</p>

<h2>Demandez votre devis gratuit</h2>
<p>Chaque projet est unique. Contactez-nous pour recevoir un devis personnalisé sous 24h, sans engagement.</p>`,
  },
  {
    title: 'Comment trouver des clients en ligne au Sénégal ?',
    category: 'Marketing Digital',
    author: 'Zolaa Tech',
    published: true,
    image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&q=80',
    excerpt:
      "Un site web seul ne suffit pas : il faut le faire connaître. Voici les stratégies digitales les plus efficaces pour attirer des clients au Sénégal en 2026.",
    content: `<h2>Avoir un site web, c'est bien. Avoir des visiteurs, c'est mieux.</h2>
<p>Beaucoup d'entrepreneurs sénégalais créent un site web et attendent que les clients arrivent. Mais sans stratégie de visibilité, un site reste invisible. Voici comment changer ça.</p>

<h2>1. Le SEO — Référencement naturel</h2>
<p>Le SEO (Search Engine Optimization) consiste à optimiser votre site pour apparaître en haut des résultats Google quand vos clients potentiels font une recherche.</p>
<p>Par exemple, si vous êtes plombier à Dakar, vous voulez apparaître quand quelqu'un tape "plombier Dakar" ou "dépannage plomberie Dakar".</p>
<p><strong>Résultats :</strong> 3 à 6 mois pour voir les premiers effets, mais les résultats sont durables et gratuits.</p>

<h2>2. Google Business Profile</h2>
<p>Créez votre fiche Google Business gratuitement. Elle apparaît dans Google Maps et dans les résultats locaux. C'est souvent la première chose que voient les clients qui cherchent un prestataire dans leur quartier.</p>
<p><strong>Action immédiate :</strong> Rendez-vous sur business.google.com et revendiquez votre établissement.</p>

<h2>3. Les réseaux sociaux</h2>
<p>Facebook et Instagram sont très utilisés au Sénégal. Publiez régulièrement vos réalisations, témoignages clients et promotions. La constance est plus importante que la fréquence.</p>

<h2>4. WhatsApp Business</h2>
<p>WhatsApp est l'outil de communication numéro 1 au Sénégal. Créez un compte WhatsApp Business avec catalogue, horaires et réponses automatiques. Ajoutez votre numéro sur votre site et vos réseaux.</p>

<h2>5. La publicité digitale</h2>
<p>Facebook Ads et Google Ads permettent de cibler des clients à Dakar ou dans des villes spécifiques, avec des budgets démarrant à 5 000 FCFA/jour. Le retour sur investissement peut être rapide pour des services locaux.</p>

<h2>Par où commencer ?</h2>
<p>Le plus important est d'avoir un site web solide comme base, puis de déployer progressivement votre présence digitale. Zolaa Tech vous accompagne sur toute la chaîne, de la création de site à la gestion de vos campagnes marketing.</p>`,
  },
];

const seedBlogSEO = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    // Insert articles (without deleting existing ones)
    const result = await News.insertMany(articles);
    console.log(`✅ ${result.length} articles SEO insérés avec succès :`);
    result.forEach((a) => console.log(`   - ${a.title}`));

    await mongoose.disconnect();
    console.log('✅ Terminé.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

seedBlogSEO();
