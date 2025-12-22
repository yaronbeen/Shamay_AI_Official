/**
 * Report Section Definitions for Guided Clause-by-Clause Generation
 * Based on Israeli Real Estate Appraisal Standards
 */

export interface CalibrationQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: { value: string; label: string }[];
  feedsTo: string;
}

export interface ReportSection {
  id: string;
  name: string;
  hebrewName: string;
  systemPrompt: string;
  calibrationQuestions: CalibrationQuestion[];
}

// Opening greeting
export const OPENING_GREETING = `אוקיי, מעולה, כמעט שם! רק צריך עוד כמה הבהרות כדי שנוכל למלא עוד כמה דברים.

נתחיל עם **סעיף 1.1 - תיאור הסביבה**:`;

// Section 1.1 - Environment Description
export const section11: ReportSection = {
  id: '1.1',
  name: 'environment_description',
  hebrewName: 'תיאור הסביבה',
  calibrationQuestions: [
    {
      id: 'q1_1_sensitive',
      question: 'איך היית רוצה שהניסוח יתייחס למאפיינים סביבתיים רגישים?',
      type: 'single',
      options: [
        { value: 'full_neutral', label: 'ניסוח מלא וניטרלי' },
        { value: 'minimal', label: 'ניסוח מצומצם וזהיר' },
        { value: 'essential_only', label: 'אזכור רק אם הכרחי' }
      ],
      feedsTo: 'environmental_features'
    },
    {
      id: 'q1_1_style',
      question: 'האם להעדיף ניסוח שמרני ומינימליסטי או תיאורי יותר?',
      type: 'single',
      options: [
        { value: 'conservative', label: 'שמרני ומינימליסטי' },
        { value: 'balanced', label: 'מאוזן' },
        { value: 'descriptive', label: 'תיאורי יותר' }
      ],
      feedsTo: 'style'
    },
    {
      id: 'q1_1_focus',
      question: 'מה חשוב לך יותר בתיאור הסביבה?',
      type: 'single',
      options: [
        { value: 'urban_wide', label: 'הקשר עירוני רחב' },
        { value: 'immediate', label: 'הסביבה הקרובה לנכס' },
        { value: 'balanced', label: 'שילוב מאוזן' }
      ],
      feedsTo: 'focus'
    },
    {
      id: 'q1_1_ending',
      question: 'איך היית רוצה שהסעיף יסתיים?',
      type: 'single',
      options: [
        { value: 'general', label: 'במשפט תיאורי כללי' },
        { value: 'concise', label: 'במשפט תמציתי מאוד' },
        { value: 'none', label: 'בלי משפט מסכם' }
      ],
      feedsTo: 'ending'
    },
    {
      id: 'q1_1_detail',
      question: 'באיזו רמת פירוט היית רוצה שתיאור הסביבה ייכתב?',
      type: 'single',
      options: [
        { value: 'short', label: 'קצר ותמציתי' },
        { value: 'balanced', label: 'מאוזן' },
        { value: 'detailed', label: 'מפורט יחסית' }
      ],
      feedsTo: 'detail_level'
    }
  ],
  systemPrompt: `אתה פועל ככותב מקצועי של שומה שמאית בישראל, בהתאם לתקינה השמאית.
המשימה שלך היא לכתוב את תת־סעיף 1.1 "תיאור הסביבה" בלבד.

נקודת המוצא היא שברשותך כתובת הנכס ופרטי זיהוי בסיסיים (כגון גוש, חלקה ותת־חלקה, ככל שנמסרו), וכן תשובות משתמש לשאלות התכיילות. מותר לך להפיק מאפיינים סביבתיים כלליים ואובייקטיביים הניתנים לזיהוי ממיקום הנכס. אסור להסתמך על ידע חברתי, תחושות שוק, מוניטין שכונתי או מסקנות שאינן ניתנות לאימות עובדתי.

הכתיבה תיעשה בשפה שמאית, תיאורית וניטרלית בלבד. הסעיף אינו שיווקי ואינו פרשני. אין להשתמש במונחים שמבטאים איכות, ביקוש, תדמית או ערך.

איסורים מוחלטים:
- אל תשתמש במילים כגון "מבוקש", "איכותי", "יוקרתי", "חלש", "מתפתח", "נחשב", "אוכלוסייה חזקה/חלשה", "תדמית", "רמת סוציו־אקונומית", או כל ביטוי של הערכה או שיפוט.
- אל תציג יתרון או חסרון.
- אל תכתוב מסקנה, לא במפורש ולא במרומז.
- אל תקשור בין התיאור לבין השווי.
- אל תכלול מידע תכנוני, משפטי, קנייני, רישויי או עתידי.

כללי אמת ומקור:
כל פרט חייב להיות: (1) נמסר במפורש על ידי המשתמש או מופיע במסמכים שהוזנו, או (2) מאפיין סביבתי כללי הניתן לזיהוי אובייקטיבי ממיקום הנכס.
כאשר מידע חסר, אל תשלים אותו ואל תציין את חסרונו.

גבולות הסעיף:
הסעיף עוסק בסביבת הנכס בלבד. אין לתאר את הנכס, הבניין או היחידה.

מבנה כתיבה (לפי הסדר):
1. מיקום יחסי של הנכס בתוך היישוב או העיר
2. אופי הסביבה הבנויה
3. שימושים דומיננטיים קיימים בפועל
4. שירותים ותשתיות בסביבה הקרובה (רק אם קיים מידע)
5. נגישות תחבורתית כללית
6. מאפיינים סביבתיים רלוונטיים (רק אם ידועים)

כללי סגנון:
- 2-4 פסקאות, 120-200 מילים
- משפטים קצרים עד בינוניים
- עברית תקנית, מקצועית וברורה
- אין דימויים, מטאפורות או שפה ציורית
- אין פסקת סיכום או מסקנה`
};

// Section 1.2 - Plot Description
export const section12: ReportSection = {
  id: '1.2',
  name: 'plot_description',
  hebrewName: 'תיאור החלקה',
  calibrationQuestions: [
    {
      id: 'q1_2_physical',
      question: 'כיצד ניתן לתאר את החלקה מבחינה פיזית כללית? (ניתן לבחור יותר מתשובה אחת)',
      type: 'multiple',
      options: [
        { value: 'flat', label: 'חלקה מישורית' },
        { value: 'mild_slope', label: 'חלקה עם שיפוע מתון' },
        { value: 'significant_slope', label: 'חלקה עם שיפוע משמעותי' },
        { value: 'regular', label: 'חלקה סדירה בצורתה' },
        { value: 'irregular', label: 'חלקה לא סדירה בצורתה' },
        { value: 'none', label: 'אין מאפיינים פיזיים מיוחדים לציון' }
      ],
      feedsTo: 'physical_characteristics'
    },
    {
      id: 'q1_2_position',
      question: 'האם יש לחלקה מיקום יחסי ייחודי בתוך המתחם או הבלוק?',
      type: 'single',
      options: [
        { value: 'corner', label: 'חלקה פינתית' },
        { value: 'internal', label: 'חלקה פנימית' },
        { value: 'multi_street', label: 'חלקה גובלת ביותר מרחוב אחד' },
        { value: 'none', label: 'אין מיקום יחסי ייחודי לציון' }
      ],
      feedsTo: 'position'
    },
    {
      id: 'q1_2_streets',
      question: 'לאילו רחובות החלקה גובלת בפועל? (ציין שמות רחובות, אם ידועים)',
      type: 'text',
      feedsTo: 'frontages'
    },
    {
      id: 'q1_2_access',
      question: 'אילו סוגי גישה קיימים לחלקה? (ניתן לבחור יותר מתשובה אחת)',
      type: 'multiple',
      options: [
        { value: 'vehicle', label: 'גישה רכבית' },
        { value: 'pedestrian', label: 'גישה רגלית' },
        { value: 'combined', label: 'גישה משולבת' },
        { value: 'unknown', label: 'אין מידע / לא רלוונטי' }
      ],
      feedsTo: 'access'
    },
    {
      id: 'q1_2_entrances',
      question: 'האם ידוע לך על כניסות קיימות לחלקה או לבניינים שעליה?',
      type: 'single',
      options: [
        { value: 'one', label: 'כניסה אחת' },
        { value: 'multiple', label: 'מספר כניסות' },
        { value: 'unknown', label: 'לא ידוע / לא רלוונטי' }
      ],
      feedsTo: 'entrances'
    }
  ],
  systemPrompt: `אתה Shamay.AI, מערכת שמאית מקצועית הפועלת בהתאם לתקינה השמאית בישראל.
בשלב זה עליך להפיק את סעיף 1.2 – תיאור החלקה בלבד.

הסעיף נכתב כתיאור טכני, עובדתי ותקני של החלקה והבינוי הקיים עליה.
אין לכלול ניתוח, פרשנות, מסקנות שמאיות, קביעות ערכיות או אזכור השפעה על שווי.

הכתיבה תיעשה בעברית תקנית, בשפה שמאית מקצועית, תיאורית וניטרלית.
אין להשתמש במונחים שיווקיים, השוואתיים או מעריכים.
אין להשתמש בניסוחים הסתברותיים כגון "נראה ש־", "ככל הנראה".

מקורות מידע מותרים:
1. נסח טאבו שהועלה על ידי המשתמש
2. צו רישום הבית המשותף, אם קיים
3. היתר בנייה מילולי, אם קיים
4. תשובות שמאי לשאלות ייעודיות

אין להשתמש במקורות נוספים. אין להשלים מידע חסר.

כללי אמת: כל פרט חייב להתבסס על מקור מותר ומפורש. מידע שאינו מופיע במקור – לא נכתב.

מבנה (3-4 פסקאות, 80-140 מילים):

פסקה 1 – זיהוי רישומי: גוש, חלקה, תתי־חלקות, שטח קרקע רשום (מנסח טאבו בלבד)

פסקה 2 – מאפיינים פיזיים: צורת החלקה, פני הקרקע, מיקום יחסי (מתשובות השמאי בלבד)

פסקה 3 – הבינוי הקיים: מספר מבנים, קומות, יחידות, תקופת בנייה (מצו/היתר אם קיים)

פסקה 4 – חזיתות ודרכי גישה: רחובות גובלים, סוגי גישה, כניסות (מתשובות השמאי)

אם אין מידע לרכיב – הפסקה לא תיכתב.

איסורים מוחלטים:
- אין אזכור זכויות בנייה, ייעודים, תכנון או פוטנציאל
- אין התייחסות לאיכות, ביקוש, נוחות או כדאיות
- אין ניתוח או רמיזה לשווי`
};

// Section 1.3 - Property Description
export const section13: ReportSection = {
  id: '1.3',
  name: 'property_description',
  hebrewName: 'תיאור נשוא השומה',
  calibrationQuestions: [
    {
      id: 'q1_3_location',
      question: 'איך היית מתאר בקצרה את מיקום הדירה בתוך הבניין, כולל כיווני האוויר העיקריים?',
      type: 'text',
      feedsTo: 'location_in_building'
    },
    {
      id: 'q1_3_layout',
      question: 'האם יש בדירה חלוקה פנימית או פונקציה מהותית שחשוב לציין? (לדוגמה: יחידת הורים, ממ"ד, מרפסת, פינת עבודה)',
      type: 'text',
      feedsTo: 'internal_layout'
    },
    {
      id: 'q1_3_finish',
      question: 'איך היית מתאר בקצרה את רמת הגמר והמצב התחזוקתי הכללי של הדירה?',
      type: 'text',
      feedsTo: 'finish_standard'
    }
  ],
  systemPrompt: `אתה Shamay.AI, מערכת שמאית מקצועית הפועלת בהתאם לתקינה השמאית בישראל.
בשלב זה עליך לנסח את סעיף תיאור נשוא השומה בלבד.

הסעיף נועד לתאר באופן עובדתי, מדויק וניטרלי את הדירה נשוא השומה.
אין לכלול ניתוח, פרשנות, מסקנות שמאיות, השוואות, או כל התייחסות לשווי.

הכתיבה תיעשה בעברית תקנית, בסגנון שמאי מקצועי, מאופק וענייני.
אין להשתמש במונחים שיווקיים, רגשיים או מעריכים.

עקרון יסוד: כל פרט חייב להישען על מקור מידע מוגדר ומותר. אין להשלים מידע חסר.

מקורות מידע לפי רכיב:
- זיהוי הדירה: נסח טאבו וצו רישום הבית המשותף
- מיקום בבניין: תשובות היוזר לשאלות תכיילות
- שטחים: שטח רשום מטאבו, שטח בנוי מפיצ'ר המדידה
- חלוקה פנימית: ניתוח תמונות + תשובות היוזר
- סטנדרט גמר: ניתוח תמונות + תשובות היוזר

מבנה (4-5 פסקאות קצרות):

פסקה 1 – זיהוי הדירה: תת־חלקה, סוג נכס, חדרים, קומה, בניין

פסקה 2 – מיקום בבניין: כיוונים, אגף, פינה (מתשובות היוזר)

פסקה 3 – שטחים: שטח רשום ושטח בנוי, פערים אם קיימים

פסקה 4 – חלוקה פנימית: תיאור תמציתי של החלוקה והשימוש

פסקה 5 – סטנדרט גמר ומצב: רמת הגמר והמצב הכללי

אם אין מידע לרכיב – הפסקה לא תיכתב.

מגבלות ברורות:
- אין ניתוח או רמיזה לשווי
- אין השוואות לדירות אחרות
- אין התייחסות לסביבה או להיבטים תכנוניים
- אין שימוש במונחים עמומים`
};

// All sections in order
export const reportSections: ReportSection[] = [section11, section12, section13];

// Helper functions
export function getSectionById(id: string): ReportSection | undefined {
  return reportSections.find(s => s.id === id);
}

export function getNextSection(currentId: string): ReportSection | undefined {
  const idx = reportSections.findIndex(s => s.id === currentId);
  return idx >= 0 && idx < reportSections.length - 1 ? reportSections[idx + 1] : undefined;
}

export function formatQuestionsMessage(section: ReportSection): string {
  let msg = '';
  section.calibrationQuestions.forEach((q, i) => {
    msg += `${i + 1}. ${q.question}\n`;
    if (q.options) {
      q.options.forEach(opt => {
        msg += `   - ${opt.label}\n`;
      });
    }
    msg += '\n';
  });
  return msg;
}

export function getSectionTransitionMessage(nextSection: ReportSection): string {
  return `\nנעבור לסעיף ${nextSection.id} - ${nextSection.hebrewName}:\n\n${formatQuestionsMessage(nextSection)}`;
}

export const COMPLETION_MESSAGE = `מעולה! סיימנו את כל הסעיפים התיאוריים.
אם יש משהו לתקן או להוסיף, אני כאן.`;
