import Database from 'better-sqlite3';
import { XMIParser } from './parser.js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class KnowledgeGraph {
  constructor(dbPath = join(__dirname, '../db/mismo.db')) {
    this.dbPath = dbPath;
    this.xmiPath = join(__dirname, '../data/mismo-v36.xmi');
    this.db = null;
  }

  async initialize() {
    // Create db directory if it doesn't exist
    const dbDir = dirname(this.dbPath);
    if (!existsSync(dbDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    
    // Check if database is already populated with real data
    const tableExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='classes'"
    ).get();

    if (!tableExists) {
      // Initializing MISMO knowledge base
      await this.createSchema();
      await this.parseAndLoad();
    } else {
      // Check if we have real data (should have hundreds of classes)
      const classCount = this.db.prepare("SELECT COUNT(*) as count FROM classes").get();
      if (classCount.count < 50) {
        // Detected mock data, re-parsing XMI file
        // Clear existing data
        this.db.exec('DELETE FROM field_mappings');
        this.db.exec('DELETE FROM relationships');
        this.db.exec('DELETE FROM enum_values');
        this.db.exec('DELETE FROM properties');
        this.db.exec('DELETE FROM enumerations');
        this.db.exec('DELETE FROM classes');
        // Parse real data
        await this.parseAndLoad();
      } else {
        // MISMO knowledge base already initialized
      }
    }
  }

  async createSchema() {
    // Classes/Types table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xmi_id TEXT UNIQUE,
        name TEXT NOT NULL,
        package TEXT,
        description TEXT,
        is_enum INTEGER DEFAULT 0,
        parent_id INTEGER,
        FOREIGN KEY (parent_id) REFERENCES classes(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_class_name ON classes(name);
      CREATE INDEX IF NOT EXISTS idx_class_xmi ON classes(xmi_id);
    `);

    // Properties/Attributes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type_name TEXT,
        type_id INTEGER,
        description TEXT,
        is_required INTEGER DEFAULT 0,
        min_occurs INTEGER DEFAULT 0,
        max_occurs INTEGER DEFAULT 1,
        FOREIGN KEY (class_id) REFERENCES classes(id),
        FOREIGN KEY (type_id) REFERENCES classes(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_prop_class ON properties(class_id);
      CREATE INDEX IF NOT EXISTS idx_prop_name ON properties(name);
    `);

    // Enumerations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enumerations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xmi_id TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_enum_name ON enumerations(name);
    `);

    // Enumeration values
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enum_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enum_id INTEGER NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (enum_id) REFERENCES enumerations(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_enum_values ON enum_values(enum_id);
    `);

    // Relationships table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_class_id INTEGER NOT NULL,
        target_class_id INTEGER NOT NULL,
        relationship_type TEXT,
        name TEXT,
        FOREIGN KEY (source_class_id) REFERENCES classes(id),
        FOREIGN KEY (target_class_id) REFERENCES classes(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_class_id);
      CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_class_id);
    `);

    // Field mappings for narrative parsing
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS field_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        narrative_pattern TEXT NOT NULL,
        field_path TEXT NOT NULL,
        confidence REAL DEFAULT 0.5
      );
      
      CREATE INDEX IF NOT EXISTS idx_mapping_pattern ON field_mappings(narrative_pattern);
    `);
  }

  async parseAndLoad() {
    // Parse the full MISMO V3.6 XMI file
    const parser = new XMIParser();
    await parser.parseXMI(this.xmiPath, this.db);
  }

  async query(sparql) {
    // Simple query interface
    return this.db.prepare(sparql).all();
  }
}

export default KnowledgeGraph;