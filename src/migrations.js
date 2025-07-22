export class MigrationHelper {
  constructor() {
    // Patterns for extracting structured data from narratives
    this.patterns = {
      // Property basics
      bedrooms: /(\d+)\s*(?:bed|br|bedroom)s?/i,
      bathrooms: /(\d+)(?:\.5)?\s*(?:bath|ba|bathroom)s?/i,
      yearBuilt: /built\s+(?:in\s+)?(\d{4})/i,
      squareFeet: /(\d{1,5})\s*(?:sq\.?\s*ft\.?|square\s*feet)/i,
      stories: /(\d+)\s*story/i,
      
      // Property type
      propertyType: /(single\s*family|condo|condominium|townhouse|townhome|manufactured|mobile\s*home)/i,
      style: /(ranch|colonial|cape\s*cod|split\s*level|contemporary|traditional|craftsman|victorian)/i,
      
      // Materials
      roofMaterial: /(asphalt\s*shingle|architectural\s*shingle|metal|tile|slate|wood\s*shake)/i,
      sidingMaterial: /(vinyl|wood|brick|stucco|hardiplank|fiber\s*cement|aluminum)/i,
      flooringMaterial: /(hardwood|carpet|tile|laminate|vinyl|lvp|luxury\s*vinyl)/i,
      
      // Kitchen features
      counterMaterial: /(granite|quartz|laminate|butcher\s*block|solid\s*surface|tile|marble)/i,
      cabinetMaterial: /(wood|laminate|thermofoil|metal)/i,
      kitchenUpdate: /kitchen\s*(?:was\s*)?(?:updated|remodeled|renovated)\s*(?:in\s*)?(\d{4})/i,
      
      // Condition
      overallCondition: /(excellent|good|average|fair|poor)\s*(?:condition|shape)/i,
      
      // Updates/features
      updates: /(?:updated|remodeled|renovated|new)\s*(kitchen|bathroom|bath|roof|hvac|windows|flooring)/gi,
      
      // Lot/Site
      lotSize: /(\d+(?:\.\d+)?)\s*(?:acre|ac)/i,
      lotDimensions: /(\d+)\s*x\s*(\d+)/i
    };
  }

  parseNarrative(text) {
    const extracted = {
      fields: {},
      confidence: {},
      unmatched: []
    };

    // Normalize text
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // Extract bedrooms
    const bedroomMatch = normalizedText.match(this.patterns.bedrooms);
    if (bedroomMatch) {
      extracted.fields['Property.BedroomTotalCount'] = parseInt(bedroomMatch[1]);
      extracted.confidence['Property.BedroomTotalCount'] = 0.95;
    }

    // Extract bathrooms
    const bathroomMatch = normalizedText.match(this.patterns.bathrooms);
    if (bathroomMatch) {
      const value = bathroomMatch[0].includes('.5') 
        ? parseFloat(bathroomMatch[1] + '.5')
        : parseInt(bathroomMatch[1]);
      extracted.fields['Property.BathroomTotalCount'] = value;
      extracted.confidence['Property.BathroomTotalCount'] = 0.95;
    }

    // Extract year built
    const yearMatch = normalizedText.match(this.patterns.yearBuilt);
    if (yearMatch) {
      extracted.fields['Property.YearBuilt'] = parseInt(yearMatch[1]);
      extracted.confidence['Property.YearBuilt'] = 0.9;
    }

    // Extract square footage
    const sqftMatch = normalizedText.match(this.patterns.squareFeet);
    if (sqftMatch) {
      extracted.fields['Property.GrossLivingAreaSquareFeetCount'] = parseInt(sqftMatch[1]);
      extracted.confidence['Property.GrossLivingAreaSquareFeetCount'] = 0.85;
    }

    // Extract property type
    const typeMatch = normalizedText.match(this.patterns.propertyType);
    if (typeMatch) {
      const typeMap = {
        'single family': 'SingleFamily',
        'condo': 'Condominium',
        'condominium': 'Condominium',
        'townhouse': 'Townhouse',
        'townhome': 'Townhouse',
        'manufactured': 'ManufacturedHousing',
        'mobile home': 'ManufacturedHousing'
      };
      const normalized = typeMatch[1].toLowerCase().replace(/\s+/g, ' ');
      extracted.fields['Property.PropertyType'] = typeMap[normalized] || typeMatch[1];
      extracted.confidence['Property.PropertyType'] = 0.9;
    }

    // Extract architectural style
    const styleMatch = normalizedText.match(this.patterns.style);
    if (styleMatch) {
      extracted.fields['Property.ArchitecturalDesignType'] = this.capitalizeWords(styleMatch[1]);
      extracted.confidence['Property.ArchitecturalDesignType'] = 0.8;
    }

    // Extract materials
    const roofMatch = normalizedText.match(this.patterns.roofMaterial);
    if (roofMatch) {
      extracted.fields['Property.RoofSurfaceMaterialType'] = this.capitalizeWords(roofMatch[1]);
      extracted.confidence['Property.RoofSurfaceMaterialType'] = 0.85;
    }

    const sidingMatch = normalizedText.match(this.patterns.sidingMaterial);
    if (sidingMatch) {
      extracted.fields['Property.ExteriorWallCoveringType'] = this.capitalizeWords(sidingMatch[1]);
      extracted.confidence['Property.ExteriorWallCoveringType'] = 0.85;
    }

    // Extract kitchen features
    const counterMatch = normalizedText.match(this.patterns.counterMaterial);
    if (counterMatch) {
      extracted.fields['Kitchen.CountertopMaterialType'] = this.capitalizeWords(counterMatch[1]);
      extracted.confidence['Kitchen.CountertopMaterialType'] = 0.8;
    }

    const kitchenUpdateMatch = normalizedText.match(this.patterns.kitchenUpdate);
    if (kitchenUpdateMatch) {
      extracted.fields['Kitchen.UpdateYear'] = parseInt(kitchenUpdateMatch[1]);
      extracted.confidence['Kitchen.UpdateYear'] = 0.85;
    }

    // Extract condition
    const conditionMatch = normalizedText.match(this.patterns.overallCondition);
    if (conditionMatch) {
      extracted.fields['Property.PropertyConditionType'] = this.capitalizeWords(conditionMatch[1]);
      extracted.confidence['Property.PropertyConditionType'] = 0.75;
    }

    // Find unmatched significant portions
    const sentences = normalizedText.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.trim().length > 20) {
        let matched = false;
        for (const pattern of Object.values(this.patterns)) {
          if (pattern.test(sentence)) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          extracted.unmatched.push(sentence.trim());
        }
      }
    }

    return extracted;
  }

  capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  suggestMappings(legacyField) {
    // Map common legacy field names to MISMO paths
    const commonMappings = {
      // Basic property info
      'address': 'Property.Address',
      'year_built': 'Property.YearBuilt',
      'year built': 'Property.YearBuilt',
      'construction year': 'Property.YearBuilt',
      'bedrooms': 'Property.BedroomTotalCount',
      'beds': 'Property.BedroomTotalCount',
      'bathrooms': 'Property.BathroomTotalCount',
      'baths': 'Property.BathroomTotalCount',
      'square_feet': 'Property.GrossLivingAreaSquareFeetCount',
      'sq_ft': 'Property.GrossLivingAreaSquareFeetCount',
      'living_area': 'Property.GrossLivingAreaSquareFeetCount',
      'gla': 'Property.GrossLivingAreaSquareFeetCount',
      
      // Property type
      'property_type': 'Property.PropertyType',
      'prop_type': 'Property.PropertyType',
      'style': 'Property.ArchitecturalDesignType',
      'design': 'Property.ArchitecturalDesignType',
      
      // Valuation
      'appraised_value': 'PropertyValuation.PropertyValuationAmount',
      'market_value': 'PropertyValuation.PropertyValuationAmount',
      'value': 'PropertyValuation.PropertyValuationAmount',
      'effective_date': 'PropertyValuation.PropertyValuationEffectiveDate',
      'appraisal_date': 'PropertyValuation.PropertyValuationEffectiveDate',
      
      // Site
      'lot_size': 'Site.SiteAcreageNumber',
      'acreage': 'Site.SiteAcreageNumber',
      'zoning': 'Site.ZoningClassificationType',
      
      // Construction
      'foundation': 'Construction.FoundationMaterialType',
      'roof_type': 'Construction.RoofSurfaceMaterialType',
      'roof_material': 'Construction.RoofSurfaceMaterialType',
      'exterior_walls': 'Construction.ExteriorWallCoveringType',
      'siding': 'Construction.ExteriorWallCoveringType'
    };

    const normalized = legacyField.toLowerCase().replace(/[_-]/g, ' ').trim();
    
    // Direct mapping
    if (commonMappings[normalized]) {
      return {
        field: legacyField,
        suggestedMapping: commonMappings[normalized],
        confidence: 0.9
      };
    }

    // Fuzzy matching
    const suggestions = [];
    for (const [key, value] of Object.entries(commonMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        suggestions.push({
          field: legacyField,
          suggestedMapping: value,
          confidence: 0.7
        });
      }
    }

    return suggestions.length > 0 ? suggestions[0] : {
      field: legacyField,
      suggestedMapping: null,
      confidence: 0,
      message: 'No direct mapping found'
    };
  }

  convertLegacyFormat(legacyData, format = 'generic') {
    const converted = {
      mismoData: {},
      mappingReport: [],
      unmappedFields: []
    };

    for (const [key, value] of Object.entries(legacyData)) {
      const mapping = this.suggestMappings(key);
      
      if (mapping.suggestedMapping && mapping.confidence > 0.5) {
        converted.mismoData[mapping.suggestedMapping] = value;
        converted.mappingReport.push({
          legacy: key,
          mismo: mapping.suggestedMapping,
          confidence: mapping.confidence,
          value: value
        });
      } else {
        converted.unmappedFields.push({
          field: key,
          value: value,
          reason: 'No confident mapping found'
        });
      }
    }

    return converted;
  }
}