#!/usr/bin/env node
import { KnowledgeGraph } from './src/knowledge-graph.js';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db/mismo.db');

console.log('Force rebuilding MISMO database...');

// Delete existing database if it exists
if (existsSync(dbPath)) {
  console.log('Removing existing database...');
  unlinkSync(dbPath);
}

// Initialize and parse
const kg = new KnowledgeGraph(dbPath);
kg.initialize()
  .then(() => {
    console.log('Database rebuild complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error rebuilding database:', err);
    process.exit(1);
  });