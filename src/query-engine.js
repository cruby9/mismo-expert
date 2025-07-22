import Database from 'better-sqlite3';
import { MigrationHelper } from './migrations.js';

export class QueryEngine {
  constructor(dbPath = './db/mismo.db') {
    this.db = new Database(dbPath);
    this.migrationHelper = new MigrationHelper();
  }

  async getFieldsForFeature(feature) {
    // Map common features to MISMO entities and fields
    const featureMappings = {
      'kitchen': {
        entities: ['Kitchen', 'Appliance', 'Room'],
        keywords: ['kitchen', 'counter', 'cabinet', 'appliance']
      },
      'bathroom': {
        entities: ['Bathroom', 'Room'],
        keywords: ['bath', 'tub', 'shower', 'toilet', 'vanity']
      },
      'exterior': {
        entities: ['Structure', 'Construction', 'ExteriorFeature'],
        keywords: ['exterior', 'siding', 'roof', 'foundation', 'window']
      },
      'site': {
        entities: ['Site', 'SiteFeature', 'SiteUtility'],
        keywords: ['lot', 'site', 'utility', 'drainage', 'topography']
      },
      'neighborhood': {
        entities: ['Neighborhood', 'Location', 'Area', 'Site', 'Property'],
        keywords: ['neighborhood', 'location', 'area', 'vicinity', 'district', 'community', 'locale', 'surroundings']
      }
    };

    const mapping = featureMappings[feature.toLowerCase()] || {
      entities: [],
      keywords: [feature.toLowerCase()]
    };

    // Query for relevant fields
    const query = `
      SELECT DISTINCT
        c.name as class_name,
        p.name as property_name,
        p.type_name,
        p.is_required,
        e.name as enum_name
      FROM classes c
      JOIN properties p ON c.id = p.class_id
      LEFT JOIN enumerations e ON p.type_id = e.id
      WHERE (
        c.name IN (${mapping.entities.map(() => '?').join(',')})
        OR ${mapping.keywords.map(() => 'LOWER(p.name) LIKE ?').join(' OR ')}
      )
      ORDER BY c.name, p.name
    `;

    const params = [
      ...mapping.entities,
      ...mapping.keywords.map(k => `%${k}%`)
    ];

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(...params);
      
      return {
        feature,
        fields: results.map(row => ({
          className: row.class_name,
          fieldName: row.property_name,
          fieldPath: `${row.class_name}.${row.property_name}`,
          dataType: row.type_name,
          required: row.is_required === 1,
          enumType: row.enum_name
        }))
      };
    } catch (error) {
      // If DB not initialized, return mock data
      return this.getMockFieldsForFeature(feature);
    }
  }

  async getFieldInfo(fieldPath) {
    const [className, propertyName] = fieldPath.split('.');
    
    const query = `
      SELECT 
        c.name as class_name,
        c.description as class_desc,
        p.name as property_name,
        p.description as property_desc,
        p.type_name,
        p.is_required,
        p.min_occurs,
        p.max_occurs,
        e.name as enum_name
      FROM classes c
      JOIN properties p ON c.id = p.class_id
      LEFT JOIN enumerations e ON p.type_id = e.id
      WHERE c.name = ? AND p.name = ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.get(className, propertyName);
      
      if (!result) {
        return { error: `Field not found: ${fieldPath}` };
      }

      // Get enum values if applicable
      let enumValues = [];
      if (result.enum_name) {
        const enumQuery = `
          SELECT value, description 
          FROM enum_values 
          WHERE enum_id = (SELECT id FROM enumerations WHERE name = ?)
          ORDER BY value
        `;
        const enumStmt = this.db.prepare(enumQuery);
        enumValues = enumStmt.all(result.enum_name);
      }

      return {
        fieldPath,
        className: result.class_name,
        classDescription: result.class_desc,
        propertyName: result.property_name,
        propertyDescription: result.property_desc,
        dataType: result.type_name,
        required: result.is_required === 1,
        minOccurs: result.min_occurs,
        maxOccurs: result.max_occurs,
        enumType: result.enum_name,
        enumValues
      };
    } catch (error) {
      return this.getMockFieldInfo(fieldPath);
    }
  }

  async validateData(data, context = 'general') {
    const errors = [];
    const warnings = [];

    // Basic validation logic
    for (const [key, value] of Object.entries(data)) {
      // Check if field exists
      const fieldInfo = await this.getFieldInfo(key);
      
      if (fieldInfo.error) {
        warnings.push({
          field: key,
          message: `Unknown field: ${key}`
        });
        continue;
      }

      // Validate enum values
      if (fieldInfo.enumType && fieldInfo.enumValues.length > 0) {
        const validValues = fieldInfo.enumValues.map(ev => ev.value);
        if (!validValues.includes(value)) {
          errors.push({
            field: key,
            message: `Invalid value '${value}'. Must be one of: ${validValues.join(', ')}`
          });
        }
      }

      // Check required fields
      if (fieldInfo.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: key,
          message: `Required field is empty`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      context
    };
  }

  async getEnumValues(enumType) {
    // Mock data for common enums
    const mockEnums = {
      'PropertyType': [
        { value: 'SingleFamily', description: 'Single Family Detached' },
        { value: 'Condominium', description: 'Condominium Unit' },
        { value: 'Townhouse', description: 'Townhouse' },
        { value: 'Cooperative', description: 'Cooperative Unit' },
        { value: 'ManufacturedHome', description: 'Manufactured/Mobile Home' },
        { value: 'MultiFamily', description: 'Multi-Family Property' }
      ],
      'KitchenCabinetMaterialEnum': [
        { value: 'Wood', description: 'Wood cabinets' },
        { value: 'Laminate', description: 'Laminate cabinets' },
        { value: 'Metal', description: 'Metal cabinets' },
        { value: 'Custom', description: 'Custom cabinets' }
      ],
      'KitchenCountertopMaterialEnum': [
        { value: 'Granite', description: 'Granite countertops' },
        { value: 'Quartz', description: 'Quartz countertops' },
        { value: 'Marble', description: 'Marble countertops' },
        { value: 'Laminate', description: 'Laminate countertops' },
        { value: 'Tile', description: 'Tile countertops' }
      ]
    };
    
    // Check mock data first
    if (mockEnums[enumType]) {
      return {
        enumName: enumType,
        enumDescription: `${enumType} enumeration values`,
        values: mockEnums[enumType]
      };
    }
    
    const query = `
      SELECT 
        e.name as enum_name,
        e.description as enum_desc,
        ev.value,
        ev.description as value_desc
      FROM enumerations e
      JOIN enum_values ev ON e.id = ev.enum_id
      WHERE e.name = ?
      ORDER BY ev.value
    `;

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(enumType);
      
      if (results.length === 0) {
        // Return a structured response even when not found
        return { 
          enumName: enumType,
          enumDescription: 'Enumeration not found',
          values: [],
          error: `Enumeration not found: ${enumType}` 
        };
      }

      return {
        enumType: results[0].enum_name,
        description: results[0].enum_desc,
        values: results.map(r => ({
          value: r.value,
          description: r.value_desc
        }))
      };
    } catch (error) {
      return this.getMockEnumValues(enumType);
    }
  }

  async mapNarrativeToFields(text) {
    return this.migrationHelper.parseNarrative(text);
  }

  async checkRequiredFields(propertyType, useCase) {
    const requiredFields = {
      'SingleFamily': {
        'appraisal': [
          'Property.Address',
          'Property.PropertyType',
          'Property.YearBuilt',
          'Property.GrossLivingArea',
          'Property.BedroomCount',
          'Property.BathroomCount',
          'PropertyValuation.PropertyValuationAmount',
          'PropertyValuation.PropertyValuationEffectiveDate'
        ]
      }
    };

    const fields = requiredFields[propertyType]?.[useCase] || [];
    
    return {
      propertyType,
      useCase,
      required: fields,
      requiredFields: fields.map(f => {
        const [className, propertyName] = f.split('.');
        return {
          fieldPath: f,
          className,
          propertyName,
          description: `Required for ${useCase} of ${propertyType}`
        };
      })
    };
  }

  async getRelationships(entity) {
    // Return mock relationships for now
    const relationships = {
      'Property': ['Address', 'Site', 'Structure', 'PropertyValuation'],
      'Borrower': ['Employment', 'Income', 'Asset', 'Liability'],
      'Loan': ['Property', 'Borrower', 'LoanTerms']
    };

    return {
      entity,
      relatedEntities: relationships[entity] || [],
      description: `Entities related to ${entity}`
    };
  }

  // Mock data methods for when DB is not initialized
  getMockFieldsForFeature(feature) {
    const mockData = {
      'kitchen': {
        fields: [
          {
            className: 'Kitchen',
            fieldName: 'CountertopMaterialType',
            fieldPath: 'Kitchen.CountertopMaterialType',
            dataType: 'KitchenCountertopMaterialEnum',
            required: false,
            enumType: 'KitchenCountertopMaterialEnum'
          },
          {
            className: 'Kitchen',
            fieldName: 'CabinetMaterialType',
            fieldPath: 'Kitchen.CabinetMaterialType',
            dataType: 'KitchenCabinetMaterialEnum',
            required: false,
            enumType: 'KitchenCabinetMaterialEnum'
          }
        ]
      }
    };

    return {
      feature,
      fields: mockData[feature]?.fields || []
    };
  }

  getMockFieldInfo(fieldPath) {
    return {
      fieldPath,
      className: fieldPath.split('.')[0],
      propertyName: fieldPath.split('.')[1],
      dataType: 'string',
      required: false,
      description: 'Mock field description'
    };
  }

  getMockEnumValues(enumType) {
    const mockEnums = {
      'PropertyTypeEnum': ['SingleFamily', 'Condominium', 'Townhouse', 'Manufactured'],
      'KitchenCountertopMaterialEnum': ['Granite', 'Quartz', 'Laminate', 'Butcher Block', 'Tile']
    };

    return {
      enumType,
      values: (mockEnums[enumType] || []).map(v => ({ value: v, description: v }))
    };
  }
}