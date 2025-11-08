/**
 * Locked Hebrew Templates
 * 
 * These strings MUST NOT be translated or modified.
 * They represent the legal/formal Hebrew text that appears in reports.
 * Only the {{variables}} within them should be replaced with actual data.
 * 
 * DO NOT modify without legal/PM approval.
 */

export const LOCKED_TEMPLATES = {
  // ===== CHAPTER TITLES (Constant) =====
  CHAPTER_TITLES: {
    CHAPTER_1: 'פרק 1 – תיאור הנכס והסביבה',
    CHAPTER_2: 'פרק 2 – מצב משפטי',
    CHAPTER_3: 'פרק 3 – מידע תכנוני',
    CHAPTER_4: 'פרק 4 – גורמים ושיקולים באומדן השווי',
    CHAPTER_5: 'פרק 5 – תחשיבים לאומדן השווי',
    CHAPTER_6: 'פרק 6 – השומה',
  },
  
  // ===== SECTION TITLES (Constant) =====
  SECTION_TITLES: {
    SECTION_2_1: '2.1 נסח רישום מקרקעין (נסח טאבו)',
    SECTION_2_2: '2.2 מסמכי בית משותף',
    SECTION_2_3: '2.3 הסתייגות',
    SECTION_3_1: '3.1 ריכוז תכניות בניין עיר תקפות',
    SECTION_3_2: '3.2 ריכוז זכויות בנייה',
    SECTION_3_3: '3.3 רישוי בנייה',
    SECTION_3_4: '3.4 זיהום קרקע',
    SECTION_5_1: '5.1 נתוני השוואה',
    SECTION_5_2: '5.2 תחשיב שווי הנכס',
  },
  
  // ===== CHAPTER 2.1 - TABU EXTRACT =====
  TABU_INTRO: `תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין {{tabu_meta.registrar_office}}, אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, בתאריך {{tabu_meta.extract_date}}.

חלקה {{parcel.number}} בגוש {{parcel.block}}, בשטח קרקע רשום של {{parcel.area_sqm}} מ"ר.`,
  
  SUBPARCEL_DESCRIPTION: `תת חלקה {{subparcel.number}}, דירה בקומה {{subparcel.floor}}, במבנה {{subparcel.building_number}}, בשטח רשום של {{subparcel.registered_area_sqm}} מ"ר{{#if subparcel.additional_areas}} (שטחים נוספים: {{subparcel.additional_areas}}){{/if}}, חלקים ברכוש המשותף: {{subparcel.common_parts}}.`,
  
  // ===== CHAPTER 2 - REPEATING PATTERNS =====
  ATTACHMENT_TEMPLATE: `{{type}} בשטח {{size_sqm}} מ"ר{{#if symbol}}, המסומנ/ת בתשריט באות {{symbol}}{{/if}}{{#if color}}, בצבע {{color}}{{/if}}.`,
  
  OWNERSHIP_TEMPLATE: `{{owner_name}}, {{id_type}} {{id_number}}, חלק בנכס – {{fraction}}.`,
  
  MORTGAGE_TEMPLATE: `משכנתא מדרגה {{rank}} לטובת {{beneficiary}} על סך {{amount_nis}} ₪, חלק בנכס: {{fraction}}, מיום {{date}}.`,
  
  NOTE_TEMPLATE: `{{action_type}} מיום {{date}} לטובת {{beneficiary}}{{#if extra}}, {{extra}}{{/if}}.`,
  
  // ===== CHAPTER 2.3 - LEGAL DISCLAIMER =====
  LEGAL_DISCLAIMER: `אין בתיאור המצב המשפטי כדי להוות חוות דעת משפטן. החתום מטה אינו משפטן ואלו הנתונים המשפטיים, שהוצגו בפניו לצורך הכנת חוות הדעת. במידה וקיימים מסמכים שלא הובאו לידיעתו, ייתכן ויהיה בהם כדי לשנות את ההערכה.`,
  
  // ===== CHAPTER 3.4 - CONTAMINATION =====
  CONTAMINATION_DEFAULT: `בחוות דעת זו לא הובאו לידיעת הח"מ ולא הייתה לח"מ סיבה לחשד לקיומם של חומרים מסוכנים או מזהמים. קיומם של חומרים מסוכנים/מזהמים יכול להשפיע על שווי הנכס ו/או לגרור עלויות טיפול ו/או מיגון. השווי בהערכה זו מבוסס על ההנחה כי אין חומרים מזהמים קיימים בנכס או בסביבתו אשר יכולים להשפיע על שווי הנכס. נושא החומרים המזהמים אינו תחת אחריות הח"מ אשר אינו בעל ידע הדרוש לגילויים של חומרים מזהמים ונושא זה לא נלקח בחשבון בתחשיב השומה.`,
  
  // ===== CHAPTER 4 - INTRO =====
  CONSIDERATIONS_INTRO: `באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:`,
  
  // ===== CHAPTER 5.1 - COMPARABLES INTRO =====
  COMPARABLES_INTRO: `הובאו בחשבון נתוני עסקאות מכר של דירות וותיקות בסביבת הנכס נשוא חוות הדעת, עפ"י דיווחים במערכת מידע-נדל"ן של רשות המיסים ומידע משלים מתוך היתרי הבניה הסרוקים במערכת המידע ההנדסי של עיריית {{city}}, תוך מתן התאמות נדרשות לנשוא חוות הדעת (כגון: רמת גמר, מיקום, שוליות ועוד):`,
  
  // ===== CHAPTER 5.2 - CALCULATION INTRO =====
  CALCULATION_INTRO: `בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי אקו' לנכס נשוא השומה מוערך כ-₪{{calc.eq_psm}}.`,
  
  VAT_INCLUDED: `השווי כולל מע"מ.`,
  
  // ===== CHAPTER 6 - FINAL VALUATION =====
  FINAL_VALUATION_PARAGRAPH: `בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל, ובהביאי בחשבון שווים של נכסים דומים רלוונטיים, שווי הנכס בגבולות ‎{{asset_value_num}}‎ ₪ (‎{{asset_value_txt}}‎).`,
  
  CURRENT_STATE: `הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.`,
  
  // ===== APPRAISER DECLARATION (Locked - TA99) =====
  APPRAISER_DECLARATION: `הנני מצהיר, כי אין לי כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה. הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.`,
  
  SIGNATURE_INTRO: `ולראיה באתי על החתום,`,
  
  // ===== PURPOSE & LIMITATION =====
  PURPOSE: `שומת מקרקעין בקריטריון של קונה מרצון ומוכר מרצון (שווי שוק).`,
  
  LIMITATION: `אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד.`,
  
  // ===== INTRO PARAGRAPH (Page 2) =====
  INTRO_PARAGRAPH: `נתבקשתי לאמוד את שווי הזכויות בנכס שבנדון. לצורך הכנת השומה נערך ביקור בנכס ונערך סקר מחירי שוק, ולהלן חוות הדעת:`,
}

/**
 * Replace variables in a locked template
 * Variables use {{path.to.field}} syntax
 * Conditional blocks use {{#if field}}...{{/if}} syntax
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  // Handle conditional blocks {{#if field}}...{{/if}}
  result = result.replace(/\{\{#if ([^}]+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
    const value = getNestedValue(data, condition.trim())
    return value ? content : ''
  })
  
  // Handle {{#each array}}...{{/each}} blocks
  result = result.replace(/\{\{#each ([^}]+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayPath, itemTemplate) => {
    const array = getNestedValue(data, arrayPath.trim())
    if (!Array.isArray(array) || array.length === 0) {
      return ''
    }
    return array.map(item => renderTemplate(itemTemplate, item)).join('\n')
  })
  
  // Replace simple variables {{field.path}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim())
    return value !== undefined && value !== null ? String(value) : match
  })
  
  return result
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.')
  let value: any = obj
  
  for (const part of parts) {
    if (value === undefined || value === null) {
      return undefined
    }
    value = value[part]
  }
  
  return value
}

/**
 * Format helpers for common patterns
 */
export const TEMPLATE_HELPERS = {
  formatCurrency: (value: number): string => {
    return `₪${value.toLocaleString('he-IL')}`
  },
  
  formatDate: (value: string | Date): string => {
    const date = typeof value === 'string' ? new Date(value) : value
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  },
  
  formatHebrewDate: (value: string | Date): string => {
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    const date = typeof value === 'string' ? new Date(value) : value
    return `${date.getDate()} ב${months[date.getMonth()]} ${date.getFullYear()}`
  },
}

