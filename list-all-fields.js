#!/usr/bin/env node
import Database from 'better-sqlite3';

const db = new Database('./db/mismo.db');

console.log('='.repeat(60));
console.log('ALL FIELDS IN MISMO DATABASE');
console.log('='.repeat(60));

// Get all classes and their properties
const classes = db.prepare(`
  SELECT DISTINCT name 
  FROM classes 
  ORDER BY name
`).all();

console.log('\nClasses found:', classes.length);

// For each class, get its properties
classes.forEach(cls => {
  const properties = db.prepare(`
    SELECT p.name, p.type_name, p.description
    FROM properties p
    JOIN classes c ON p.class_id = c.id
    WHERE c.name = ?
    ORDER BY p.name
  `).all(cls.name);
  
  if (properties.length > 0) {
    console.log(`\n${cls.name} (${properties.length} properties):`);
    properties.forEach(prop => {
      console.log(`  - ${prop.name} (${prop.type_name})`);
      if (prop.description && prop.description.toLowerCase().includes('neighborhood')) {
        console.log(`    *** CONTAINS "neighborhood" in description: ${prop.description}`);
      }
    });
  }
});

// Also search descriptions for neighborhood mentions
console.log('\n' + '='.repeat(60));
console.log('SEARCHING ALL DESCRIPTIONS FOR "NEIGHBORHOOD":');
console.log('='.repeat(60));

const descriptionSearch = db.prepare(`
  SELECT 
    c.name as class_name,
    p.name as property_name,
    p.description
  FROM properties p
  JOIN classes c ON p.class_id = c.id
  WHERE LOWER(p.description) LIKE '%neighborhood%'
  ORDER BY c.name, p.name
`).all();

if (descriptionSearch.length > 0) {
  descriptionSearch.forEach(field => {
    console.log(`\n${field.class_name}.${field.property_name}`);
    console.log(`  Description: ${field.description}`);
  });
} else {
  console.log('\nNo fields with "neighborhood" in their description found.');
}

db.close();