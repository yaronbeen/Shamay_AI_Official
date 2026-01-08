/**
 * System Prompt Builder for Claude Agent SDK Chat
 * Supports guided clause-by-clause report generation
 */

import {
  OPENING_GREETING,
  reportSections,
  formatQuestionsMessage,
  getSectionById,
  getNextSection,
  COMPLETION_MESSAGE,
  type ReportSection
} from './report-sections';

interface DocumentContext {
  hasTabu: boolean;
  hasPermit: boolean;
  hasCondoOrder: boolean;
  extractedFieldsCount: number;
  validationIssues: number;
  sessionStep: number;
  propertyAddress?: string;
  gush?: string;
  parcel?: string;
  subParcel?: string;
}

interface GuidedFlowState {
  currentSectionId: string | null;
  completedSections: string[];
  calibrationAnswers: Record<string, Record<string, string | string[]>>;
}

/**
 * Build the initial greeting with first section questions
 */
export function buildOpeningMessage(): string {
  const firstSection = reportSections[0];
  return `${OPENING_GREETING}

${formatQuestionsMessage(firstSection)}

ענה על השאלות ואני אכתוב את הסעיף.`;
}

/**
 * Build the system prompt for the chat assistant
 */
export function buildSystemPrompt(context: DocumentContext, flowState?: GuidedFlowState): string {
  const currentSection = flowState?.currentSectionId
    ? getSectionById(flowState.currentSectionId)
    : reportSections[0];

  return `# SHAMAY.AI - מערכת כתיבת שומות מקצועית

אתה מערכת AI מקצועית לכתיבת שומות מקרקעין בישראל, בהתאם לתקינה השמאית.
תפקידך לנהל תהליך כתיבת סעיפי השומה בצורה מודרכת, סעיף אחר סעיף.

## מצב נוכחי
${buildContextSection(context)}

## תהליך העבודה

אתה מנהל תהליך כתיבה מודרך של סעיפי השומה:
- סעיף 1.1: תיאור הסביבה
- סעיף 1.2: תיאור החלקה
- סעיף 1.3: תיאור נשוא השומה

לכל סעיף:
1. שאל את שאלות התכיילות הרלוונטיות
2. קבל תשובות מהמשתמש
3. כתוב את הסעיף לפי ההנחיות המקצועיות
4. הצג את הטקסט המוכן להעתקה
5. המשך מיד לסעיף הבא

## הנחיות כתיבה כלליות

- כתוב בעברית תקנית, מקצועית ושמאית
- אל תשתמש בשפה שיווקית או ערכית
- אל תכלול מסקנות או התייחסות לשווי
- השתמש רק במידע שנמסר או שניתן לזיהוי אובייקטיבי
- אל תשלים מידע חסר - פשוט השמט את הרכיב

## פורמט תשובה

- אל תשתמש בכוכביות (*) או ב-** להדגשה
- כתוב טקסט רגיל בלבד
- הצג את הסעיף המוכן בבלוק ברור
- לאחר הסעיף, המשך מיד לשאלות הסעיף הבא

## שימוש בכלים

- get_extracted_data: שלוף נתונים ממסמכים
- search_documents: חפש טקסט במסמכים
- generate_section_text: צור טקסט סעיף מקצועי

${currentSection ? buildSectionInstructions(currentSection) : ''}`;
}

/**
 * Build section-specific instructions
 */
function buildSectionInstructions(section: ReportSection): string {
  return `
## הנחיות לסעיף ${section.id} - ${section.hebrewName}

${section.systemPrompt}`;
}

function buildContextSection(context: DocumentContext): string {
  const sections: string[] = [];

  // Document status
  const docs: string[] = [];
  if (context.hasTabu) docs.push('נסח טאבו');
  if (context.hasPermit) docs.push('היתר בנייה');
  if (context.hasCondoOrder) docs.push('צו בית משותף');

  sections.push(`מסמכים זמינים: ${docs.length > 0 ? docs.join(', ') : 'אין'}`);

  // Property info
  if (context.propertyAddress) {
    sections.push(`כתובת: ${context.propertyAddress}`);
  }
  if (context.gush && context.parcel) {
    let legalId = `גוש ${context.gush}, חלקה ${context.parcel}`;
    if (context.subParcel) {
      legalId += `, תת-חלקה ${context.subParcel}`;
    }
    sections.push(`זיהוי: ${legalId}`);
  }

  if (context.extractedFieldsCount > 0) {
    sections.push(`שדות שחולצו: ${context.extractedFieldsCount}`);
  }

  return sections.join('\n');
}

/**
 * Build context from session data
 */
export function extractDocumentContext(
  session: Record<string, unknown>,
  aiExtractions: Array<{ extraction_type: string; extracted_fields?: Record<string, unknown> }>
): DocumentContext {
  const uploads = (session.uploads || []) as Array<{ type: string; status: string }>;

  // Count extracted fields
  let extractedFieldsCount = 0;
  for (const extraction of aiExtractions) {
    const fields = extraction.extracted_fields || {};
    extractedFieldsCount += Object.keys(fields).filter(k => {
      const value = fields[k];
      return value !== null && value !== undefined && value !== '';
    }).length;
  }

  // Build address
  const street = session.street as string || '';
  const buildingNumber = session.building_number as string || '';
  const city = session.city as string || '';
  const propertyAddress = `${street} ${buildingNumber}, ${city}`.trim();

  return {
    hasTabu: uploads.some(u => u.type === 'tabu' && u.status === 'completed') ||
      aiExtractions.some(e => e.extraction_type === 'land_registry'),
    hasPermit: uploads.some(u => u.type === 'building_permit' && u.status === 'completed') ||
      aiExtractions.some(e => e.extraction_type === 'building_permit'),
    hasCondoOrder: uploads.some(u => u.type === 'condo_order' && u.status === 'completed') ||
      aiExtractions.some(e => e.extraction_type === 'shared_building_order'),
    extractedFieldsCount,
    validationIssues: 0,
    sessionStep: 3,
    propertyAddress: propertyAddress !== ', ' ? propertyAddress : undefined,
    gush: session.gush as string,
    parcel: session.parcel as string,
    subParcel: session.sub_parcel as string,
  };
}

/**
 * Build section generation prompt with calibration answers
 */
export function buildSectionGenerationPrompt(
  section: ReportSection,
  calibrationAnswers: Record<string, string | string[]>,
  documentContext: DocumentContext
): string {
  let answersText = 'תשובות התכיילות:\n';

  for (const q of section.calibrationQuestions) {
    const answer = calibrationAnswers[q.id];
    if (answer) {
      const answerDisplay = Array.isArray(answer) ? answer.join(', ') : answer;
      answersText += `- ${q.question}: ${answerDisplay}\n`;
    }
  }

  return `${section.systemPrompt}

## נתוני הנכס
${buildContextSection(documentContext)}

## ${answersText}

כתוב את סעיף ${section.id} - ${section.hebrewName} בהתבסס על המידע שלמעלה.
הצג את הטקסט המוכן בפורמט ברור להעתקה.`;
}

/**
 * Build transition message to next section
 */
export function buildSectionTransition(completedSection: ReportSection): string {
  const nextSection = getNextSection(completedSection.id);

  if (!nextSection) {
    return COMPLETION_MESSAGE;
  }

  return `נעבור לסעיף ${nextSection.id} - ${nextSection.hebrewName}:

${formatQuestionsMessage(nextSection)}`;
}

// Re-export for convenience
export {
  reportSections,
  getSectionById,
  getNextSection,
  formatQuestionsMessage,
  OPENING_GREETING,
  COMPLETION_MESSAGE
} from './report-sections';

