# Valuation Document Requirements Analysis

## Comparison: Current Implementation vs. CSV Requirements

### ✅ = We Have | ⚠️ = Partially Implemented | ❌ = Missing

---

## דף שער (Cover Page) - TA1-TA8

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA1 | לוגו | ✅ | Company logo implemented |
| TA2 | סוג שומה | ✅ | `valuationType` field exists |
| TA3 | רחוב | ✅ | `street` field exists |
| TA4 | מספר בניין | ✅ | `buildingNumber` field exists |
| TA5 | שכונה | ✅ | `neighborhood` field exists |
| TA6 | עיר | ✅ | `city` field exists |
| TA7 | תמונה חיצונית | ✅ | `selectedImagePreview` exists |
| TA8 | פוטר ממותג | ✅ | Footer with logo implemented |

---

## דף פתיחה (Opening Page) - TA9-TA32

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA9 | Header לוגו | ✅ | Document header with logo exists |
| TA10 | שדה לכבוד | ✅ | `clientName` exists |
| TA11 | תאריך כתיבת השומה | ✅ | `valuationDate` exists |
| TA12 | סיממונו (ID שומה) | ✅ | `referenceNumber` exists |
| TA13 | סוג שומה | ✅ | `valuationType` exists |
| TA14-TA17 | רחוב, מספר, שכונה, עיר | ✅ | All address fields exist |
| TA18 | מטרת חוות הדעת | ⚠️ | Hardcoded, needs dropdown/options |
| TA19 | מזמין חוות הדעת | ⚠️ | Format: `{תאריך ביקור}, על ידי {שם השמאי}, שמאי מקרקעין. {USER INPUT}` |
| TA20 | תאריך ביקור הנכס | ✅ | `visitDate` exists |
| TA21 | תאריך קובע לשומה | ✅ | `valuationDate` exists |
| TA22 | פרטי הנכס | ✅ | Section exists |
| TA23 | מהות הנכס | ⚠️ | `propertyEssence` exists but format needs: `{{סוג דירה}} בת/בן {{מספר חדרים}} בקומה ה{{קומה}}` |
| TA24 | גוש | ✅ | `extractedData.gush` exists |
| TA25 | חלקה | ✅ | `extractedData.chelka` exists |
| TA26 | תת חלקה | ✅ | `extractedData.sub_chelka` exists |
| TA27 | שטח דירה רשום | ✅ | `registeredArea` exists |
| TA28 | **שטח דירה בנוי** | ❌ | **Missing: Measurement/מערך - needs calculation from multiple sources** |
| TA29 | הצמדות | ⚠️ | Basic implementation, needs full summary from טאבו |
| TA30 | זכויות | ⚠️ | Needs default "בעלות פרטית" with user input |
| TA31 | FOOT NOTES - מקור המידע | ❌ | **Missing: "1 בהתאם לנסח רישון מקרקעין מיום {תאריך}" + "2על פי מדידה מתוך תכנית היתר בניה מס' {היתר בניה - מספר} מיום {היתר בניה - תאריך}"** |
| TA32 | פוטר ממותג | ✅ | Footer with logo exists |

---

## פרק 1 - תיאור הנכס והסביבה (Chapter 1) - TA33-TA54

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA33 | פרק 1 תיאור הנכס והסביבה | ✅ | Chapter 1 exists |
| TA34 | סעיף 1.1 תיאור הסביבה | ✅ | Section 1.1 exists |
| TA35 | מפת הסביבה (GOVMAP) | ✅ | `gisScreenshots` exists |
| TA36 | פוטר ממותג | ✅ | Footer exists |
| TA37 | סעיף 1.2 תיאור החלקה | ✅ | Section 1.2 exists |
| TA38 | פסקה שמתארת את החלקה | ⚠️ | Needs template: `חלקה {{חלקה}} בגוש {{גוש}}, בשטח קרקע רשום של {{שטח קרקע רשום}}, צורתה {{צורת החלקה}}, פני הקרקע {{פני החלקה}}. על החלקה בנויים {{טאבו - כמה מבנים}} בני - ((קומות המבנים)) הרשומים יחדיו כבית משותף` |
| TA39 | פסקה שמתארת את הבית המשותף | ❌ | **Missing: "נשוא חוות הדעת נמצא בכתובת {{רחוב)) ((מספר מבנה))"** |
| TA40 | תצ:א GIS | ⚠️ | Screenshot exists but needs grid of 6-8 images for user selection |
| TA41 | תצ"א 2 GIS | ❌ | **Missing: Second GIS screenshot option** |
| TA42 | גבולות החלקה | ❌ | **Missing: "גבולות החלקה:" header** |
| TA43 | צפון | ❌ | **Missing: Free text description - North** |
| TA44 | דרום | ❌ | **Missing: Free text description - South** |
| TA45 | מזרח | ❌ | **Missing: Free text description - East** |
| TA46 | מערב | ❌ | **Missing: Free text description - West** |
| TA44 (duplicate) | סעיף 1.3 תיאור הבניין ונשוא חוות הדעת | ⚠️ | Needs: "מעיון בתיק הבניין הסרוק שבוועדה לתכנון ובניה {שם הועדה המקומית}, אותרו המסמכים הרלוונטים הבאים:" |
| TA45 | פסקה משפטית/כללית על תת החלקה | ⚠️ | Needs template: `נשוא חוות הדעת הינה תת חלקה {{תת חלקה}}, המהווה {{מהות הנכס}}, הממוקמת בקומה ה{{קומה }} של הבניין, פונה לכיוונים {{כווני אוויר}} , בשטח בנוי רשום של "שטח דירה רשום" ובשטח בנוי רישוי של כ-"שטח בנוי" + מפרסת פתוחה בשטח של כ"שטח מפרסת" (מתוך מדידה גראפית מתכנית היתר בניה), לדירה צמודים "הצמדות"` |
| TA46 | תיאור הדירה - חלוקה פנימית | ❌ | **Missing: "הדירה בחלוקה פנימי (טקסט חופשי)"** |
| TA47 | תיאור הדירה - ניתוח תמונות | ⚠️ | Basic AI analysis exists, needs dedicated prompt for image analysis |
| TA48 | פוטר ממותג | ✅ | Footer exists |
| TA49 | תמונות אופייניות להמחשה | ❌ | **CANCELLED per CSV** |
| TA50 | סעיף 1.4 רישוי | ✅ | Section 1.4 exists |
| TA51 | היתר מילולי 1 | ⚠️ | Needs: "היתר בניס מס' {{היתר בנייה - מספר}} מיום {{תאריך הפקת היתר}}, OCR מסעיף מותר/מותר לבניה בהיתר הבנייה המילולי" |
| TA52 | היתר מילולי 2 | ❌ | **Missing: Second building permit with OCR from "מותר" section** |
| TA53 | תשריט מתוך גרמושקה | ⚠️ | Garmushka exists but needs screenshot integration |
| TA54 | פוטר ממותג | ✅ | Footer exists |

---

## פרק 2 - מצב משפטי (Chapter 2) - TA55-TA68

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA55 | פרק 2 מצב מפשטי | ✅ | Chapter 2 exists |
| TA56 | סעיף 2.1 נסח רישום מקרקעין | ✅ | Section 2.1 exists |
| TA57 | פסקה: משפטי - פרטים כליים | ⚠️ | Needs full template: `המידע מבוסס על מידע ממערכת המידע התכנוני של הועדה המקומית לתכנון ולבניה {שם הוועדה המקומית} חלקה {{טאבו - חלקה}} בגוש {{טאבו - גוש}} בשטח קרקע רשום של {{טאבו - שטח קרקע של כל החלקה}} בכתובת {{טאבו - כתובת (מהנסח טאבו AS IS}} תתי חלקות {{תתי חלקות (כמה יש)}} תקנון - {{טאבו - תקנון}} מבנים - {{טאבו - כמה מבנים}} הערות לחלקה: {{הערות לכל החלקה}} זיקות הנאה: {{טאבו - זיקות הנאה - מהות}}, {{טאבו - זיקות הנאה - תיאור}}` |
| TA58 | פסקה: משפטי - פרטים על תת החלקה (MP) | ⚠️ | Basic exists, needs: `תת חלקה {טאבו - תת חלקה}}` |
| TA59 | (MP) תיאור הדירה | ⚠️ | Needs: `דירה בקומה {{טאבו - קומה}} במבנה (אם יש מס' מבנים) {{טאבו -מבנה (מספר מבנה}}} בשטח של {{טאבו - שטח רשום}} ושטח נוסף {{טאבו - שטחים נוספים}} בשטח {{טאבו -שטח מרפסת}}, החלק ברכוש המשותף {{טאבו - רכוש משותף}}` |
| TA60 | (MP) הצמדות | ⚠️ | Needs: `{{טאבו - הצמדות - תיאור הצמדה}} בשטח של {{טאבו - הצמדה - שטח במטר}} המסומן/נת בתשריט באות {{טאבו - הצמדות - סימון בתשריט}} ובצבע {{טאבו - הצמדות - צבע בתשריט}}` |
| TA61 | (MP) בעלויות | ⚠️ | Needs: `{{טאבו - בעלויות - שם הבעלים}} ת.ז {{טאבו - בעלויות - מספר זיהוי}}, החלק בנכס {{טאבו - בעלויות - חלק בנכס}}` |
| TA62 | (MP) משכנתאות | ⚠️ | Needs: `משכתנה מדרגה {{טאבו - משכנתאות - דרגה}} לטובת {{טאבו - משכנתאות - בעלי המשכנתא}} מיום {{טאבו - משכנתאות - תאריך}}, IF שמות הבעלים = שמות הלווים = על כל הבעלים {{טאבו - משכתנאות - חלק בנכס}}` |
| TA63 | (MP) הערות | ❌ | **Missing: טאבו - הערות - שם המוטב, טאבו - הערות - מהות פעולה** |
| TA64 | (BM) סעיף 2.2 בית משותף | ⚠️ | Basic exists, needs: `ב.מ - מתי הופק צו בית משותף, טאבו - חלקה, טאבו - גוש, טאבו - שטח קרקע של כל החלקה` |
| TA65 | (BM) תיאור הבית המשותף | ⚠️ | Needs: `ב.מ - תיאור הבית - מבנה, ב.מ - תיאור הבית - כתובת (אם יש כמה מבנים חוזר על עצמו כל התיאור), ב.מ - תיאור הבית - מספר קומות, ב.מ - תיאור הבית - מספר תתי חלקות, "ב.מ - סה""כ תתי חלקות (של כל המבנים)"` |
| TA66 | (BM) תיאור תת החלקה | ⚠️ | Needs: `ב.מ - תת חלקה - מספר תת חלקה, ב.מ - תת חלקה - קומה, ב.מ - תת חלקה - מספר מבנה, ב.מ - תת חלקה - שטח, ב.מ - תת חלקה - חלקים ברכוש המשותף, ב.מ - תת חלקה - תיאור` |
| TA67 | תשריטים מתוך הבית המשותף | ❌ | **Missing: Screenshot from shared building order (צו בית משותף)** |
| TA68 | סעיף 2.3 הסתגויות | ❌ | **Missing: "לאור הנתונים המפורטים לעיל, תוך ביצוע התאמות נדרשות לנכס נשוא חוות הדעת(מיקום, זמן, שוליות, פרטיות ועוד) ובניכוי עסקאות קיצוון שווי מ"ר אקו' בנוי נע בגבולות {שווי למטר}"** |

---

## פרק 3 - מידע תכנוני (Chapter 3) - TA69-TA72

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA69 | פרק 3 מידע תכנוני | ❌ | **Missing: Entire Chapter 3** |
| TA70 | סעיף 3.1 ריכוז תוכניות רלוונטיות בתוקף | ❌ | **Missing: Table of relevant plans** |
| TA71 | סעיף 3.2 ריכוז זכויות בנייה | ❌ | **Missing: "בשים לב למיקומו של הנכס, לגודלו, ולכל שאר נתוניו כאמור ומפורט לעיל, בהביאי בחשבון שווים של נכסים דומים רלוונטים, סביר לאמוד את שווי הזכויות בנכס במצבו בגבולות {שווי נכס} ({שווי הנכס במילים})"** |
| TA72 | צילום תשריט מהתב"ע | ❌ | **Missing: Screenshot of master plan (תב"ע)** |

---

## פרק 4 - גורמים ושיקולים (Chapter 4) - TA73-TA89

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA73 | פרק 4 גורמים ושיקולים | ✅ | Chapter 4 exists |
| TA74-TA77 | סעיף הסביבה והנכס | ⚠️ | Basic exists, needs full templates |
| TA78-TA80 | סעיף הזכויות | ⚠️ | Basic exists, needs full templates |
| TA82-TA84 | סעיף תכנוני ורישוי | ⚠️ | Basic exists, needs full templates |
| TA85-TA89 | סעיף אומדן השווי | ⚠️ | Basic exists, needs full templates |

---

## פרק 5 - תחשיבים (Chapter 5) - TA90-TA97

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA90 | פרק 5 תחשיבים | ✅ | Chapter 5 exists |
| TA91 | סעיף 5.1 נתוני השוואה | ✅ | Section 5.1 exists with CSV table |
| TA92 | סעיף 5.1 מחיר למ"ר אקו | ⚠️ | Needs field: `שווי למטר` |
| TA93 | סעיף 5.1 מקדם אקו' | ❌ | **Missing: `מקדם אקו` field** |
| TA94 | סעיף 5.2 תחשב שווי הנכס | ✅ | Section 5.2 exists |
| TA95 | סעיף 5.2 טבלה | ⚠️ | Table exists but needs: `שווי למטר, שטח דירה (מערך), שטח מרפסת (מערך), שטח אקו` |
| TA96 | שווי הנכס - תיאור הנכס | ⚠️ | Needs: `{{סוג דירה}} בת/בן {{מספר חדרים}} ברחוב {{רחוב}}, בשכונת {{שכונת}}` |
| TA97 | השווי כולל מע"מ | ✅ | "השווי כולל מע"מ" exists |

---

## פרק 6 - השומה (Chapter 6) - TA98

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA98 | פרק 6 השומה | ✅ | Chapter 6 exists with `שווי נכס` and `שווי הנכס במילים` |

---

## הצהרה וחתימה (Declaration & Signature) - TA99-TA100

| TA_ID | Field | Status | Notes |
|-------|-------|--------|-------|
| TA99 | הצהרה | ✅ | Appraiser's declaration exists |
| TA100 | חתימה+חותמת+תיאור תפקיד | ✅ | Signature section exists |

---

## Summary

### ✅ Fully Implemented: ~40%
### ⚠️ Partially Implemented: ~35%
### ❌ Missing: ~25%

### Critical Missing Items:
1. **TA28**: שטח דירה בנוי (מערך) - Measurement calculation
2. **TA31**: FOOT NOTES - מקור המידע
3. **TA42-TA46**: גבולות החלקה (North, South, East, West)
4. **TA46**: תיאור הדירה - חלוקה פנימית
5. **TA52**: היתר מילולי 2
6. **TA63**: (MP) הערות
7. **TA67**: תשריטים מתוך הבית המשותף
8. **TA68**: סעיף 2.3 הסתגויות
9. **TA69-TA72**: Entire Chapter 3 - מידע תכנוני
10. **TA93**: מקדם אקו'

### Fields Needing Template Updates:
- Most TA fields need proper template formatting with placeholders
- Many fields need conditional logic (IF statements)
- Some fields need user input options (dropdowns, free text)

