/**
 * Property Assessment Data Validator
 * Validates user input data before database insertion
 */

export class PropertyAssessmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate complete property assessment data
   * @param {Object} data - Assessment data to validate
   * @returns {Object} - Validation result with errors and warnings
   */
  validateAssessmentData(data) {
    this.errors = [];
    this.warnings = [];

    // Required field validations
    this.validateRequired(data);
    
    // Format validations
    this.validateFormats(data);
    
    // Business logic validations
    this.validateBusinessRules(data);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      hasWarnings: this.warnings.length > 0
    };
  }

  /**
   * Validate required fields
   * @private
   */
  validateRequired(data) {
    const requiredFields = [
      { field: 'client_name', label: 'שם הלקוח' },
      { field: 'assessment_type', label: 'סוג שומה' },
      { field: 'city', label: 'עיר' }
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!data[field] || data[field].toString().trim() === '') {
        this.errors.push(`${label} (${field}) הוא שדה חובה`);
      }
    });

    // Recommended fields (warnings if missing)
    const recommendedFields = [
      { field: 'street_name', label: 'רחוב' },
      { field: 'house_number', label: 'מספר' },
      { field: 'visit_date', label: 'תאריך ביקור' },
      { field: 'visitor_name', label: 'המבקר' }
    ];

    recommendedFields.forEach(({ field, label }) => {
      if (!data[field] || data[field].toString().trim() === '') {
        this.warnings.push(`מומלץ למלא את ${label} (${field})`);
      }
    });
  }

  /**
   * Validate data formats
   * @private
   */
  validateFormats(data) {
    // Date validation
    if (data.visit_date) {
      if (!this.isValidDate(data.visit_date)) {
        this.errors.push('תאריך ביקור אינו תקין. השתמש בפורמט DD/MM/YYYY או YYYY-MM-DD');
      }
    }

    // Number validations
    if (data.rooms !== undefined && data.rooms !== null && data.rooms !== '') {
      const rooms = parseInt(data.rooms);
      if (isNaN(rooms) || rooms < 0 || rooms > 50) {
        this.errors.push('מספר חדרים חייב להיות מספר תקין בין 0 ל-50');
      }
    }

    if (data.user_sections_count !== undefined && data.user_sections_count !== null && data.user_sections_count !== '') {
      const sections = parseInt(data.user_sections_count);
      if (isNaN(sections) || sections < 0 || sections > 1000) {
        this.errors.push('מספר סעיפים חייב להיות מספר תקין בין 0 ל-1000');
      }
    }

    if (data.eco_coefficient !== undefined && data.eco_coefficient !== null && data.eco_coefficient !== '') {
      const eco = parseFloat(data.eco_coefficient);
      if (isNaN(eco) || eco < 0 || eco > 10) {
        this.errors.push('מקדם אקו חייב להיות מספר תקין בין 0 ל-10');
      }
    }

    // Text length validations
    this.validateTextLength(data.client_name, 'שם הלקוח', 200);
    this.validateTextLength(data.street_name, 'רחוב', 200);
    this.validateTextLength(data.house_number, 'מספר', 20);
    this.validateTextLength(data.neighborhood, 'שכונה', 100);
    this.validateTextLength(data.city, 'עיר', 100);
    this.validateTextLength(data.visitor_name, 'המבקר', 200);
    this.validateTextLength(data.presenter_name, 'המציג', 200);
    this.validateTextLength(data.assessment_type, 'סוג שומה', 100);
    this.validateTextLength(data.floor_number, 'קומה', 50);

    // Long text fields
    this.validateTextLength(data.free_text_additions, 'טקסט חופשי להשלמות', 2000);
    this.validateTextLength(data.air_directions, 'כיווני אוויר', 500);
    this.validateTextLength(data.north_description, 'תיאור צפון', 1000);
    this.validateTextLength(data.south_description, 'תיאור דרום', 1000);
    this.validateTextLength(data.east_description, 'תיאור מזרח', 1000);
    this.validateTextLength(data.west_description, 'תיאור מערב', 1000);
    this.validateTextLength(data.relevant_plans_table, 'טבלת תוכניות רלוונטיות', 5000);
  }

  /**
   * Validate business rules
   * @private
   */
  validateBusinessRules(data) {
    // Status validation
    const validStatuses = ['draft', 'completed', 'reviewed', 'approved'];
    if (data.status && !validStatuses.includes(data.status)) {
      this.errors.push(`סטטוס לא תקין. חייב להיות אחד מהבאים: ${validStatuses.join(', ')}`);
    }

    // Visit date should not be in the future (warning)
    if (data.visit_date && this.isValidDate(data.visit_date)) {
      const visitDate = new Date(data.visit_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (visitDate > today) {
        this.warnings.push('תאריך ביקור הוא בעתיד - האם זה נכון?');
      }

      // Very old dates (warning)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (visitDate < twoYearsAgo) {
        this.warnings.push('תאריך ביקור הוא ישן מאוד - האם זה נכון?');
      }
    }

    // Hebrew text validation (warning for non-Hebrew names)
    if (data.client_name && !this.containsHebrew(data.client_name)) {
      this.warnings.push('שם הלקוח לא מכיל תווים עבריים - האם זה נכון?');
    }

    // Address completeness check
    if (data.street_name && !data.house_number) {
      this.warnings.push('צוין רחוב אבל לא מספר בית');
    }

    if (data.house_number && !data.street_name) {
      this.warnings.push('צוין מספר בית אבל לא רחוב');
    }
  }

  /**
   * Validate text field length
   * @private
   */
  validateTextLength(value, fieldName, maxLength) {
    if (value && value.toString().length > maxLength) {
      this.errors.push(`${fieldName} ארוך מדי (מקסימום ${maxLength} תווים)`);
    }
  }

  /**
   * Check if date is valid
   * @private
   */
  isValidDate(dateStr) {
    if (!dateStr) return false;
    
    // Try different date formats
    let date = null;
    
    // DD/MM/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(year, month - 1, day);
        
        // Check if the date is valid (handles invalid dates like 31/02/2023)
        if (date.getFullYear() == year && 
            date.getMonth() == month - 1 && 
            date.getDate() == day) {
          return true;
        }
      }
    }
    
    // YYYY-MM-DD format
    if (dateStr.includes('-')) {
      date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return true;
      }
    }
    
    // Date object
    if (dateStr instanceof Date) {
      return !isNaN(dateStr.getTime());
    }
    
    return false;
  }

  /**
   * Check if text contains Hebrew characters
   * @private
   */
  containsHebrew(text) {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }

  /**
   * Sanitize input data
   * @param {Object} data - Raw input data
   * @returns {Object} - Sanitized data
   */
  sanitizeData(data) {
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      let value = data[key];
      
      // Skip null/undefined values
      if (value === null || value === undefined) {
        sanitized[key] = value;
        return;
      }
      
      // Convert to string and trim
      if (typeof value === 'string') {
        value = value.trim();
        
        // Convert empty strings to null
        if (value === '') {
          value = null;
        }
      }
      
      // Convert numeric strings to numbers for numeric fields
      const numericFields = ['rooms', 'user_sections_count', 'eco_coefficient'];
      if (numericFields.includes(key) && typeof value === 'string' && value !== null) {
        const numValue = key === 'eco_coefficient' ? parseFloat(value) : parseInt(value);
        if (!isNaN(numValue)) {
          value = numValue;
        }
      }
      
      sanitized[key] = value;
    });
    
    return sanitized;
  }
}