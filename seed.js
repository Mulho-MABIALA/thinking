const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Portfolio = require('./models/Portfolio');
const Team = require('./models/Team');
const News = require('./models/News');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté pour le seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      Portfolio.deleteMany(),
      Team.deleteMany(),
      News.deleteMany()
    ]);

    // Create admin user
    await User.create({
      name: 'Admin Thinking Tech',
      email: 'admin@thinkingtech.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Admin créé: admin@thinkingtech.com / admin123');

    // Seed Portfolio
    await Portfolio.insertMany([
      {
        title: 'Titan Banking',
        category: 'Fintech',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        problem: 'Système bancaire legacy avec une UX obsolète et des temps de réponse lents.',
        solution: 'Refonte complète avec une architecture microservices et une interface moderne.',
        result: '+340% d\'engagement utilisateur, temps de chargement réduit de 80%.',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
        featured: true,
        order: 1
      },
      {
        title: 'Aurora Core',
        category: 'Branding',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        problem: 'Identité de marque incohérente à travers les plateformes digitales.',
        solution: 'Création d\'un système de design unifié et d\'un guide de marque complet.',
        result: 'Reconnaissance de marque augmentée de 200%, cohérence visuelle parfaite.',
        technologies: ['Figma', 'React', 'Storybook'],
        featured: true,
        order: 2
      },
      {
        title: 'Humanity+Tech',
        category: 'Design',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
        problem: 'Plateforme de don en ligne avec un taux de conversion très faible.',
        solution: 'Redesign UX centré utilisateur avec un parcours de don simplifié.',
        result: 'Taux de conversion x4, augmentation des dons mensuels de 250%.',
        technologies: ['Vue.js', 'Stripe', 'Firebase'],
        featured: false,
        order: 3
      },
      {
        title: 'Flux Management',
        category: 'SaaS',
        image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
        problem: 'Gestion de projet fragmentée entre plusieurs outils non connectés.',
        solution: 'Plateforme SaaS tout-en-un avec IA intégrée pour la prédiction de délais.',
        result: 'Productivité améliorée de 60%, adoption par 500+ entreprises.',
        technologies: ['Next.js', 'Python', 'MongoDB', 'Docker'],
        featured: true,
        order: 4
      }
    ]);
    console.log('Portfolio seedé (4 projets)');

    // Seed Team
    await Team.insertMany([
      {
        name: 'Thierry MBOKO',
        role: 'CEO & Fondateur',
        description: 'Visionnaire tech avec 15 ans d\'expérience en stratégie digitale et innovation.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        social: { linkedin: '#', github: '#', twitter: '#' },
        order: 1
      },
      {
        name: 'Awa NIANG',
        role: 'CTO',
        description: 'Experte en architecture logicielle et passionnée par les technologies émergentes.',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        social: { linkedin: '#', github: '#', twitter: '#' },
        order: 2
      },
      {
        name: 'Moussa DIALLO',
        role: 'Head of Design',
        description: 'Designer primé spécialisé en expériences utilisateur immersives et innovantes.',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        social: { linkedin: '#', github: '#', twitter: '#' },
        order: 3
      }
    ]);
    console.log('Équipe seedée (3 membres)');

    // Seed News
    await News.insertMany([
      {
        title: 'L\'IA Générative révolutionne le développement web',
        category: 'Intelligence Artificielle',
        excerpt: 'Découvrez comment les dernières avancées en IA générative transforment notre approche du développement et du design web.',
        content: 'Article complet sur l\'IA générative...',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        author: 'Thierry MBOKO',
        published: true
      },
      {
        title: 'Thinking Tech ouvre un nouveau bureau à Dakar',
        category: 'Entreprise',
        excerpt: 'Notre expansion continue avec l\'ouverture d\'un nouveau bureau au cœur de Dakar pour servir nos clients ouest-africains.',
        content: 'Article complet sur l\'expansion...',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        author: 'Awa NIANG',
        published: true
      },
      {
        title: 'Retour sur notre participation au TechCrunch Disrupt',
        category: 'Événements',
        excerpt: 'Notre équipe était présente au TechCrunch Disrupt 2025. Retour sur les tendances et les rencontres marquantes.',
        content: 'Article complet sur TechCrunch...',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        author: 'Moussa DIALLO',
        published: true
      }
    ]);
    console.log('Actualités seedées (3 articles)');

    console.log('\nSeeding terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('Erreur de seeding:', error);
    process.exit(1);
  }
};

seedData();
