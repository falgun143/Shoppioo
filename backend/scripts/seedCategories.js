'use strict';

/**
 * Category Seeder — creates the 3 core Shoppioo categories
 * Usage: node scripts/seedCategories.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

const CATEGORIES = [
  {
    name: 'Induction Cooktops',
    slug: 'induction-cooktops',
    description: 'Energy-efficient induction cooktops from top brands like Prestige, Pigeon, Bajaj, Havells and more.',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Firewood',
    slug: 'firewood',
    description: 'Premium kiln-dried and seasoned firewood for cooking, bonfires, and heating.',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Lakdi ka Chula',
    slug: 'lakdi-ka-chula',
    description: 'Traditional wood cookstoves (chula) — eco-friendly, no LPG required, works with dry wood and twigs.',
    isActive: true,
    sortOrder: 3,
  },
];

async function main() {
  console.log('\n========================================');
  console.log('   Shoppioo — Seed Categories');
  console.log('========================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  try {
    for (const cat of CATEGORIES) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (exists) {
        console.log(`  ↩  Already exists: ${cat.name}`);
        continue;
      }
      await Category.create(cat);
      console.log(`  ✓  Created: ${cat.name}`);
    }

    console.log('\n✓ Done! Categories are ready.');
    console.log('  Now log in to the admin panel and start adding products.\n');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
