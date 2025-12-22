/**
 * Claude Agent SDK Tool Definitions
 * These tools allow the AI assistant to query and interact with session data
 */

import type { ChatTool } from '@/types/chat';

export const chatTools: ChatTool[] = [
  {
    name: 'get_extracted_data',
    description: 'קבל נתונים שחולצו ממסמכים שהועלו. השתמש בכלי זה כדי לקבל ערכי שדות ספציפיים שחולצו מטאבו, היתרי בנייה, או צווי בית משותף.',
    input_schema: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: ['tabu', 'building_permit', 'condo_order', 'all'],
          description: 'סוג המסמך לשאילתה: tabu=נסח טאבו, building_permit=היתר בנייה, condo_order=צו בית משותף, all=כל המסמכים'
        },
        field_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'רשימת מזהי שדות TA_ID לשליפה (לדוגמה: TA24, TA25, TA26)'
        }
      },
      required: ['document_type']
    }
  },
  {
    name: 'get_document_content',
    description: 'קבל את תוכן הטקסט הגולמי שחולץ ממסמך ספציפי שהועלה.',
    input_schema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'מזהה המסמך (UUID) לשליפה'
        },
        document_type: {
          type: 'string',
          enum: ['tabu', 'building_permit', 'condo_order'],
          description: 'סוג המסמך'
        }
      },
      required: ['document_type']
    }
  },
  {
    name: 'explain_field',
    description: 'הסבר מה שדה TA_ID ספציפי אומר, משמעותו המשפטית, ואיך הוא משמש בשומת מקרקעין. מחזיר תשובה בעברית.',
    input_schema: {
      type: 'object',
      properties: {
        field_id: {
          type: 'string',
          description: 'מזהה שדה TA_ID (לדוגמה: TA24 לגוש, TA25 לחלקה)'
        }
      },
      required: ['field_id']
    }
  },
  {
    name: 'search_documents',
    description: 'חפש בכל המסמכים שהועלו אחר מונחים או ביטויים ספציפיים. שימושי למציאת אזכורים של שמות, מספרים, או מונחים משפטיים.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'שאילתת החיפוש (תומך בעברית)'
        },
        document_type: {
          type: 'string',
          enum: ['tabu', 'building_permit', 'condo_order', 'all'],
          description: 'סינון לפי סוג מסמך (אופציונלי)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_validation_status',
    description: 'קבל את סטטוס האימות של שדות שחולצו, כולל שדות עם רמת ביטחון נמוכה, חסרים, או עם שגיאות אימות.',
    input_schema: {
      type: 'object',
      properties: {
        include_warnings: {
          type: 'boolean',
          description: 'האם לכלול אזהרות רכות (ברירת מחדל: true)'
        },
        field_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'שדות ספציפיים לבדיקה (אופציונלי - אם לא מוגדר, בודק הכל)'
        }
      }
    }
  },
  {
    name: 'generate_report_text',
    description: 'צור טקסט מקצועי בעברית עבור סעיף ספציפי בדוח השומה בהתבסס על הנתונים שחולצו.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: [
            'property_description',      // תיאור הנכס
            'location_analysis',         // ניתוח מיקום
            'building_description',      // תיאור הבניין
            'legal_status',              // מצב משפטי
            'market_analysis',           // ניתוח שוק
            'valuation_methodology',     // שיטת השומה
            'final_assessment'           // הערכה סופית
          ],
          description: 'סעיף הדוח ליצירה'
        },
        additional_context: {
          type: 'string',
          description: 'הקשר נוסף או הוראות ליצירה (אופציונלי)'
        },
        style: {
          type: 'string',
          enum: ['formal', 'concise', 'detailed'],
          description: 'סגנון הכתיבה (ברירת מחדל: formal)'
        }
      },
      required: ['section']
    }
  },
  {
    name: 'get_comparable_analysis',
    description: 'קבל נתוני ניתוח שוק כולל עסקאות השוואה, סטטיסטיקות מחירים, וחישובי שומה.',
    input_schema: {
      type: 'object',
      properties: {
        include_excluded: {
          type: 'boolean',
          description: 'האם לכלול עסקאות שהוחרגו (ברירת מחדל: false)'
        },
        statistics_only: {
          type: 'boolean',
          description: 'האם להחזיר רק סטטיסטיקות ללא פרטי עסקאות (ברירת מחדל: false)'
        }
      }
    }
  },
  {
    name: 'web_search',
    description: 'חפש מידע באינטרנט. שימושי למציאת מידע על מחירי נדל"ן, תקנות בנייה, או מידע רלוונטי אחר לשומת מקרקעין.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'שאילתת החיפוש (תומך בעברית ואנגלית)'
        },
        num_results: {
          type: 'number',
          description: 'מספר תוצאות להחזיר (ברירת מחדל: 5, מקסימום: 10)'
        }
      },
      required: ['query']
    }
  }
];

// TA_ID Field Definitions for explain_field tool
export const taIdDefinitions: Record<string, { name: string; hebrewName: string; description: string; source: string }> = {
  // Address Fields
  'TA3': { name: 'street', hebrewName: 'רחוב', description: 'שם הרחוב בו ממוקם הנכס', source: 'ידני/טאבו' },
  'TA4': { name: 'buildingNumber', hebrewName: 'מספר בניין', description: 'מספר הבניין ברחוב', source: 'ידני/טאבו' },
  'TA5': { name: 'city', hebrewName: 'עיר', description: 'שם העיר או היישוב', source: 'ידני/טאבו' },
  'TA6': { name: 'neighborhood', hebrewName: 'שכונה', description: 'שם השכונה', source: 'ידני' },

  // Client Fields
  'TA10': { name: 'clientName', hebrewName: 'שם הלקוח', description: 'שם מזמין השומה', source: 'ידני' },
  'TA11': { name: 'referenceNumber', hebrewName: 'מספר אסמכתא', description: 'מספר אסמכתא לשומה', source: 'ידני' },
  'TA12': { name: 'shamayName', hebrewName: 'שם השמאי', description: 'שם השמאי המבצע', source: 'הגדרות משתמש' },

  // Date Fields
  'TA20': { name: 'visitDate', hebrewName: 'תאריך ביקור', description: 'תאריך ביקור בנכס', source: 'ידני' },
  'TA21': { name: 'valuationDate', hebrewName: 'תאריך שומה', description: 'תאריך קובע לשומה', source: 'ידני' },

  // Land Registry Fields (Tabu)
  'TA24': { name: 'gush', hebrewName: 'גוש', description: 'מספר גוש - יחידת רישום בטאבו המייצגת אזור גיאוגרפי. נקבע לפי מיפוי קדסטרי של מדינת ישראל.', source: 'נסח טאבו' },
  'TA25': { name: 'parcel', hebrewName: 'חלקה', description: 'מספר חלקה - יחידת קרקע בודדת בתוך הגוש. לכל חלקה בעלים רשומים ושטח מוגדר.', source: 'נסח טאבו' },
  'TA26': { name: 'subParcel', hebrewName: 'תת-חלקה', description: 'מספר תת-חלקה - חלוקה משנית של חלקה, נפוצה בבתים משותפים. כל דירה מקבלת תת-חלקה משלה.', source: 'נסח טאבו' },
  'TA27': { name: 'registeredArea', hebrewName: 'שטח רשום', description: 'השטח הרשום בטאבו במ"ר. זהו השטח המשפטי המחייב, לא בהכרח השטח הפיזי.', source: 'נסח טאבו' },

  // Ownership Fields
  'TA30': { name: 'ownershipType', hebrewName: 'סוג בעלות', description: 'סוג הזכויות (בעלות, חכירה, חכירה לדורות)', source: 'נסח טאבו' },
  'TA31': { name: 'owners', hebrewName: 'בעלים', description: 'רשימת הבעלים הרשומים וחלקם היחסי', source: 'נסח טאבו' },
  'TA32': { name: 'registryOffice', hebrewName: 'לשכת רישום', description: 'לשכת רישום המקרקעין המנהלת את התיק', source: 'נסח טאבו' },
  'TA33': { name: 'extractDate', hebrewName: 'תאריך נסח', description: 'תאריך הפקת נסח הטאבו', source: 'נסח טאבו' },

  // Mortgage/Encumbrance Fields
  'TA40': { name: 'mortgages', hebrewName: 'משכנתאות', description: 'פרטי משכנתאות רשומות על הנכס כולל זהות הנושה וסכום', source: 'נסח טאבו' },
  'TA41': { name: 'warnings', hebrewName: 'הערות אזהרה', description: 'הערות אזהרה - רישום המגביל עסקאות בנכס, למשל התחייבות למכירה', source: 'נסח טאבו' },
  'TA42': { name: 'easements', hebrewName: 'זיקות הנאה', description: 'זכויות שימוש של צד שלישי בנכס (מעבר, ניקוז וכו\')', source: 'נסח טאבו' },
  'TA43': { name: 'attachments', hebrewName: 'הצמדות', description: 'שטחים מוצמדים לדירה (חניה, מחסן, גינה)', source: 'נסח טאבו/צו' },

  // Building Permit Fields
  'TA50': { name: 'buildingPermitNumber', hebrewName: 'מספר היתר', description: 'מספר היתר הבנייה שניתן על ידי הוועדה המקומית', source: 'היתר בנייה' },
  'TA51': { name: 'buildingPermitDate', hebrewName: 'תאריך היתר', description: 'תאריך מתן היתר הבנייה', source: 'היתר בנייה' },
  'TA52': { name: 'builtArea', hebrewName: 'שטח בנוי', description: 'שטח בנוי מאושר בהיתר', source: 'היתר בנייה' },
  'TA53': { name: 'permittedUse', hebrewName: 'שימוש מותר', description: 'ייעוד השימוש המאושר (מגורים, מסחר וכו\')', source: 'היתר בנייה' },

  // Building Description Fields (from Condo Order)
  'TA60': { name: 'buildingDescription', hebrewName: 'תיאור הבניין', description: 'תיאור כללי של הבניין מצו הבית המשותף', source: 'צו בית משותף' },
  'TA61': { name: 'buildingFloors', hebrewName: 'קומות בבניין', description: 'מספר הקומות בבניין', source: 'צו בית משותף' },
  'TA62': { name: 'buildingUnits', hebrewName: 'יחידות בבניין', description: 'מספר יחידות הדיור בבניין', source: 'צו בית משותף' },
  'TA63': { name: 'commonAreas', hebrewName: 'רכוש משותף', description: 'תיאור הרכוש המשותף (חדר מדרגות, גג, מקלט)', source: 'צו בית משותף' },

  // Property Details
  'TA70': { name: 'rooms', hebrewName: 'חדרים', description: 'מספר חדרים בנכס', source: 'ידני' },
  'TA71': { name: 'floor', hebrewName: 'קומה', description: 'קומת הנכס', source: 'ידני' },
  'TA72': { name: 'balconyArea', hebrewName: 'שטח מרפסת', description: 'שטח המרפסות במ"ר', source: 'ידני/היתר' },
  'TA73': { name: 'airDirections', hebrewName: 'כיווני אוויר', description: 'כיווני האוויר של הנכס', source: 'ידני' },

  // Valuation Fields
  'TA80': { name: 'finalValuation', hebrewName: 'שווי סופי', description: 'השווי הסופי שנקבע בשומה', source: 'חישוב' },
  'TA81': { name: 'pricePerSqm', hebrewName: 'מחיר למ"ר', description: 'מחיר ממוצע למ"ר בעסקאות השוואה', source: 'חישוב' },
  'TA82': { name: 'equivalentArea', hebrewName: 'שטח שקול', description: 'שטח שקול (בנוי + 0.5 × מרפסת)', source: 'חישוב' },
};

// Export tool names for type safety
export const toolNames = chatTools.map(tool => tool.name);
