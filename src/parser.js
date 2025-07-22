import { parseString } from 'xml2js';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const parseXML = promisify(parseString);
const __dirname = dirname(fileURLToPath(import.meta.url));

export class XMIParser {
  constructor() {
    this.typeMap = new Map(); // Map XMI IDs to types
    this.enumMap = new Map(); // Map enum IDs to names
  }

  async parseXMI(xmiPath, db) {
    // Starting XMI parse
    const xmlContent = readFileSync(xmiPath, 'utf-8');
    const result = await parseXML(xmlContent, { attrkey: '$', charkey: '_' });
    
    // Start transaction for bulk insert
    const insertClass = db.prepare(`
      INSERT INTO classes (xmi_id, name, package, description, is_enum) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertProperty = db.prepare(`
      INSERT INTO properties (class_id, name, type_name, type_id, description, is_required, min_occurs, max_occurs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertEnum = db.prepare(`
      INSERT INTO enumerations (xmi_id, name, description)
      VALUES (?, ?, ?)
    `);
    
    const insertEnumValue = db.prepare(`
      INSERT INTO enum_values (enum_id, value, description)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // Parse the XMI structure
      const xmi = result['xmi:XMI'];
      const model = xmi['uml:Model'][0];
      
      // Find the Logical Data Model package
      const logicalDataModel = model.packagedElement.find(pkg => 
        pkg.$['xmi:type'] === 'uml:Package' && pkg.$.name === 'Logical Data Model'
      );
      
      if (!logicalDataModel) {
        throw new Error('Logical Data Model package not found');
      }
      
      // Process all packages recursively
      this.processPackage(logicalDataModel, '', insertClass, insertProperty, insertEnum, insertEnumValue, db);
    });
    
    transaction();
    
    // Get final counts
    const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get().count;
    const propCount = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
    const enumCount = db.prepare('SELECT COUNT(*) as count FROM enumerations').get().count;
    
    // Successfully parsed all data
  }

  processPackage(pkg, parentPath, insertClass, insertProperty, insertEnum, insertEnumValue, db) {
    const packagePath = parentPath ? `${parentPath}.${pkg.$.name}` : pkg.$.name;
    
    if (!pkg.packagedElement) return;
    
    for (const element of pkg.packagedElement) {
      if (element.$['xmi:type'] === 'uml:Package') {
        // Recursively process sub-packages
        this.processPackage(element, packagePath, insertClass, insertProperty, insertEnum, insertEnumValue, db);
      } 
      else if (element.$['xmi:type'] === 'uml:Class') {
        this.processClass(element, packagePath, insertClass, insertProperty, db);
      }
      else if (element.$['xmi:type'] === 'uml:Enumeration') {
        this.processEnumeration(element, packagePath, insertEnum, insertEnumValue, db);
      }
    }
  }

  processClass(classElement, packagePath, insertClass, insertProperty, db) {
    const className = classElement.$.name;
    const classId = classElement.$['xmi:id'];
    const isEnum = className.endsWith('Enum');
    
    // Extract description from comments if available
    let description = '';
    if (classElement.ownedComment) {
      description = classElement.ownedComment[0].$.body || '';
    }
    
    // Insert class
    const result = insertClass.run(classId, className, packagePath, description, isEnum ? 1 : 0);
    const dbClassId = result.lastInsertRowid;
    
    // Store in type map
    this.typeMap.set(classId, { name: className, dbId: dbClassId });
    
    // Process properties
    if (classElement.ownedAttribute) {
      for (const attr of classElement.ownedAttribute) {
        this.processProperty(attr, dbClassId, insertProperty, db);
      }
    }
  }

  processProperty(attr, classId, insertProperty, db) {
    if (!attr.$.name || attr.$.association) return; // Skip associations for now
    
    const propName = attr.$.name;
    let typeName = 'string';
    let typeId = null;
    let description = '';
    
    // Get type information
    if (attr.type && attr.type[0] && attr.type[0].$) {
      const typeRef = attr.type[0].$['xmi:idref'];
      if (this.typeMap.has(typeRef)) {
        const typeInfo = this.typeMap.get(typeRef);
        typeName = typeInfo.name;
        typeId = typeInfo.dbId;
      } else if (this.enumMap.has(typeRef)) {
        typeName = this.enumMap.get(typeRef);
      } else {
        // Handle primitive types
        typeName = this.mapPrimitiveType(typeRef);
      }
    }
    
    // Get constraints
    const isRequired = this.isRequired(attr);
    const minOccurs = this.getMinOccurs(attr);
    const maxOccurs = this.getMaxOccurs(attr);
    
    // Extract description from comments
    if (attr.ownedComment) {
      description = attr.ownedComment[0].$.body || '';
    }
    
    insertProperty.run(classId, propName, typeName, typeId, description, isRequired ? 1 : 0, minOccurs, maxOccurs);
  }

  processEnumeration(enumElement, packagePath, insertEnum, insertEnumValue, db) {
    const enumName = enumElement.$.name;
    const enumId = enumElement.$['xmi:id'];
    let description = '';
    
    if (enumElement.ownedComment) {
      description = enumElement.ownedComment[0].$.body || '';
    }
    
    // Insert enumeration
    const result = insertEnum.run(enumId, enumName, description);
    const dbEnumId = result.lastInsertRowid;
    
    // Store in enum map
    this.enumMap.set(enumId, enumName);
    
    // Process enum values
    if (enumElement.ownedLiteral) {
      for (const literal of enumElement.ownedLiteral) {
        const valueName = literal.$.name;
        let valueDesc = '';
        
        if (literal.ownedComment) {
          valueDesc = literal.ownedComment[0].$.body || '';
        }
        
        insertEnumValue.run(dbEnumId, valueName, valueDesc || valueName);
      }
    }
  }

  mapPrimitiveType(typeRef) {
    // Map common XMI primitive type references
    const primitiveMap = {
      'EAJava_boolean': 'boolean',
      'EAJava_int': 'integer',
      'EAJava_long': 'long',
      'EAJava_double': 'double',
      'EAJava_float': 'float',
      'EAJava_String': 'string',
      'EAJava_Date': 'date',
      'EAJava_BigDecimal': 'decimal'
    };
    
    return primitiveMap[typeRef] || 'string';
  }

  isRequired(attr) {
    if (attr.lowerValue && attr.lowerValue[0] && attr.lowerValue[0].$) {
      return attr.lowerValue[0].$.value === '1';
    }
    return false;
  }

  getMinOccurs(attr) {
    if (attr.lowerValue && attr.lowerValue[0] && attr.lowerValue[0].$) {
      return parseInt(attr.lowerValue[0].$.value) || 0;
    }
    return 0;
  }

  getMaxOccurs(attr) {
    if (attr.upperValue && attr.upperValue[0] && attr.upperValue[0].$) {
      const value = attr.upperValue[0].$.value;
      return value === '*' ? -1 : parseInt(value) || 1;
    }
    return 1;
  }
}

// Command line interface for parsing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  import('./knowledge-graph.js').then(({ KnowledgeGraph }) => {
    const kg = new KnowledgeGraph();
    kg.initialize()
      .then(() => console.log('XMI parsing complete'))
      .catch(console.error);
  });
}