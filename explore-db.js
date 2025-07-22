#!/usr/bin/env node
import Database from 'better-sqlite3';

const db = new Database('./db/mismo.db');

console.log('='.repeat(60));
console.log('MISMO DATABASE EXPLORATION');
console.log('='.repeat(60));

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nTables in database:');
tables.forEach(table => console.log(`  - ${table.name}`));

// Search for neighborhood-related fields in properties table
console.log('\n\nSearching for neighborhood-related fields...');

try {
  // First, let's see what columns exist in the properties table
  const propertiesSchema = db.prepare("PRAGMA table_info(properties)").all();
  console.log('\nProperties table schema:');
  propertiesSchema.forEach(col => console.log(`  - ${col.name} (${col.type})`));
  
  // Search for neighborhood in property names
  const neighborhoodFields = db.prepare(`
    SELECT DISTINCT
      c.name as class_name,
      p.name as property_name,
      p.description,
      p.type_name
    FROM classes c
    JOIN properties p ON c.id = p.class_id
    WHERE 
      LOWER(p.name) LIKE '%neighborhood%' OR
      LOWER(p.description) LIKE '%neighborhood%' OR
      LOWER(p.name) LIKE '%location%' OR
      LOWER(p.name) LIKE '%area%' OR
      LOWER(p.name) LIKE '%district%' OR
      LOWER(p.name) LIKE '%community%' OR
      LOWER(p.name) LIKE '%vicinity%' OR
      LOWER(p.name) LIKE '%locale%'
    ORDER BY c.name, p.name
  `).all();
  
  console.log('\n\nNeighborhood-related fields found:');
  if (neighborhoodFields.length > 0) {
    neighborhoodFields.forEach(field => {
      console.log(`\n- ${field.class_name}.${field.property_name}`);
      console.log(`  Type: ${field.type_name}`);
      if (field.description) {
        console.log(`  Description: ${field.description}`);
      }
    });
  } else {
    console.log('No neighborhood-related fields found.');
  }
  
  // Let's also check for any classes that might be neighborhood-related
  const neighborhoodClasses = db.prepare(`
    SELECT DISTINCT
      name,
      description
    FROM classes
    WHERE 
      LOWER(name) LIKE '%neighborhood%' OR
      LOWER(name) LIKE '%location%' OR
      LOWER(description) LIKE '%neighborhood%'
    ORDER BY name
  `).all();
  
  console.log('\n\nNeighborhood-related classes:');
  if (neighborhoodClasses.length > 0) {
    neighborhoodClasses.forEach(cls => {
      console.log(`\n- ${cls.name}`);
      if (cls.description) {
        console.log(`  Description: ${cls.description}`);
      }
    });
  } else {
    console.log('No neighborhood-related classes found.');
  }
  
  // Check for specific common fields
  console.log('\n\nChecking for specific common neighborhood fields:');
  const specificChecks = [
    'NeighborhoodDescription',
    'LocationDescription', 
    'AreaDescription',
    'SiteDescription'
  ];
  
  specificChecks.forEach(fieldName => {
    const results = db.prepare(`
      SELECT c.name as class_name, p.name as property_name
      FROM classes c
      JOIN properties p ON c.id = p.class_id
      WHERE p.name = ?
    `).all(fieldName);
    
    if (results.length > 0) {
      results.forEach(r => {
        console.log(`  Found: ${r.class_name}.${r.property_name}`);
      });
    }
  });
  
} catch (error) {
  console.error('Error querying database:', error.message);
}

db.close();
console.log('\n' + '='.repeat(60));