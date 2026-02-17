// Script pour insérer les services en base
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Service = require('../models/Service');

const services = [
  {
    title: 'Création Web & App',
    description: 'Des plateformes intuitives et esthétiques pour transformer chaque visiteur en client fidèle.',
    icon: '🌐',
    features: [
      'Sites Vitrines & E-commerce',
      'Paiements Mobile Money intégrés',
      'Optimisation SEO & Performance',
      'Design Futuriste & Mobile First',
      'Hébergement & Maintenance',
    ],
    order: 1
  },
  {
    title: 'Design & Identité Visuelle',
    description: 'Une identité de marque forte et mémorable qui vous distingue de la concurrence.',
    icon: '🎨',
    features: [
      'Création de Logos professionnels',
      'Flyers, Brochures & Supports Print',
      'Charte Graphique complète',
      'UI/UX Design sur mesure',
      'Affiches & Bannières publicitaires',
      'Cartes de visite & Papeterie',
    ],
    order: 2
  },
  {
    title: 'Stratégie Marketing',
    description: "Une feuille de route claire pour positionner votre marque en leader sur son marché.",
    icon: '📣',
    features: [
      'Audit & Personas Clients',
      "Plan d'action sur 3 mois",
      'Positionnement de marque',
      'Copywriting & Messages Clés',
      'Gestion des réseaux sociaux',
    ],
    order: 3
  },
  {
    title: 'Publicité (Ads)',
    description: 'Des campagnes ciblées sur Meta & Google pour un ROI optimal et une croissance mesurable.',
    icon: '📊',
    features: [
      'Gestion Meta Ads (Facebook/Instagram)',
      'Campagnes Google Ads (Search)',
      'Ciblage Précis & Retargeting',
      'Reporting Mensuel Transparent',
    ],
    order: 4
  },
  {
    title: 'Application Mobile',
    description: 'Des apps iOS & Android performantes et intuitives pour engager vos utilisateurs partout.',
    icon: '📱',
    features: [
      'Développement iOS & Android',
      'React Native & Flutter',
      'Intégration API & Backend',
      'Publication App Store & Google Play',
    ],
    order: 5
  },
  {
    title: 'IA & Data',
    description: "Exploitez la puissance de l'intelligence artificielle pour automatiser votre business.",
    icon: '🤖',
    features: [
      'Chatbots & Assistants IA',
      'Analyse de données & Dashboards',
      'Automatisation des processus',
      'Modèles prédictifs sur mesure',
    ],
    order: 6
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connecté à MongoDB');
  await Service.deleteMany({});
  console.log('Anciens services supprimés');
  const result = await Service.insertMany(services);
  console.log(`${result.length} services insérés avec succès !`);
  result.forEach(s => console.log(` - [${s.order}] ${s.title} ${s.icon}`));
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
