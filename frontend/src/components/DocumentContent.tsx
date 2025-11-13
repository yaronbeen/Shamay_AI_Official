'use client'

import { ValuationData } from './ValuationWizard'

interface DocumentContentProps {
  data: ValuationData
  isPreview?: boolean
}

export function DocumentContent({ data, isPreview = true }: DocumentContentProps) {
  // DEBUG: Let's see what data we're actually getting
  console.log('🔍 DocumentContent - Data received:')
  console.log('Data object:', data)
  console.log('Address fields:')
  console.log('- street:', data.street)
  console.log('- buildingNumber:', data.buildingNumber) 
  console.log('- city:', data.city)
  console.log('- neighborhood:', data.neighborhood)
  console.log('Shamay fields:')
  console.log('- shamayName:', data.shamayName)
  console.log('- shamaySerialNumber:', data.shamaySerialNumber)
  console.log('Images:')
  console.log('- signaturePreview:', data.signaturePreview ? 'Present' : 'Missing')
  console.log('- selectedImagePreview:', data.selectedImagePreview ? 'Present' : 'Missing')
  
  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('he-IL')
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  const formatHebrewDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getFullAddress = () => {
    const { street, buildingNumber, city, neighborhood } = data
    if (!street || !buildingNumber || !city) return '[כתובת]'
    
    let address = `${street} ${buildingNumber}, ${city}`
    if (neighborhood) {
      address = `${street} ${buildingNumber}, שכונת ${neighborhood}, ${city}`
    }
    return address
  }

  const getReferenceNumber = () => {
    if (data.referenceNumber) return data.referenceNumber
    const address = getFullAddress().replace(/[^א-ת0-9]/g, '')
    return `1000_${address.substring(0, 10)}`
  }

  const getClientName = () => {
    return data.clientName || '[שם מזמין חוות הדעת]'
  }

  const getShamayName = () => {
    return data.shamayName || 'דוד כהן, שמאי מקרקעין מוסמך'
  }

  const getShamayLicense = () => {
    return data.shamaySerialNumber || 'רישיון שמאי מס\' 12345'
  }

  // ✅ NEW: Hebrew number to text conversion
  const numberToHebrewText = (num: number): string => {
    const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
    const tens = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
    const hundreds = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות']
    const thousands = ['', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים']
    const millions = ['', 'מיליון', 'שני מיליונים', 'שלושה מיליונים', 'ארבעה מיליונים', 'חמישה מיליונים', 'שישה מיליונים', 'שבעה מיליונים', 'שמונה מיליונים', 'תשעה מיליונים']

    if (num === 0) return 'אפס'
    if (num < 0) return 'מינוס ' + numberToHebrewText(-num)
    if (num > 999999999) return 'מספר גדול מדי להמרה אוטומטית'

    let result = ''
    
    // Millions
    if (num >= 1000000) {
      const millionsPart = Math.floor(num / 1000000)
      result += millions[millionsPart] + ' '
      num %= 1000000
    }
    
    // Thousands
    if (num >= 1000) {
      const thousandsPart = Math.floor(num / 1000)
      result += thousands[thousandsPart] + ' '
      num %= 1000
    }
    
    // Hundreds
    if (num >= 100) {
      const hundredsPart = Math.floor(num / 100)
      result += hundreds[hundredsPart] + ' '
      num %= 100
    }
    
    // Tens and ones
    if (num >= 20) {
      const tensPart = Math.floor(num / 10)
      const onesPart = num % 10
      result += tens[tensPart]
      if (onesPart > 0) {
        result += ' ו' + ones[onesPart]
      }
    } else if (num >= 10) {
      result += tens[num - 10]
    } else if (num > 0) {
      result += ones[num]
    }
    
    return result.trim()
  }

  // ✅ ENHANCED: A4 Layout with proper margins and Hebrew typography
  const containerStyle = isPreview ? {
    width: '100%',
    maxWidth: '210mm', // A4 width
    minHeight: '297mm', // A4 height
    fontFamily: 'Calibri, Arial, David, sans-serif',
    fontSize: '12pt',
    lineHeight: '1.5',
    color: '#000000',
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '25mm 20mm', // 2.5cm top/bottom, 2cm left/right margins
    boxSizing: 'border-box' as const,
    direction: 'rtl' as const,
    textAlign: 'right' as const
  } : {
    width: '210mm',
    minHeight: '297mm',
    fontFamily: 'Calibri, Arial, David, sans-serif',
    fontSize: '12pt',
    lineHeight: '1.5',
    color: '#000000',
    backgroundColor: '#ffffff',
    margin: '0',
    padding: '25mm 20mm',
    boxSizing: 'border-box' as const,
    direction: 'rtl' as const,
    textAlign: 'right' as const
  }

  return (
    <div style={containerStyle} className="valuation-document">
      {/* ✅ NEW: Professional Header */}
      <div className="document-header" style={{
        borderBottom: '2px solid #000',
        paddingBottom: '10px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>
          {getShamayName()}
        </div>
        <div style={{ fontSize: '10pt' }}>
          {getShamayLicense()}
        </div>
      </div>

      {/* ✅ ENHANCED: Cover Page */}
      <div className="cover-page" style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '18pt', 
          fontWeight: 'bold', 
          textAlign: 'center',
          marginBottom: '20px',
          lineHeight: '1.3'
        }}>
          שומת מקרקעין מלאה
        </h1>
        
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'bold', 
          textAlign: 'center',
          marginBottom: '15px'
        }}>
          אומדן שווי זכויות במקרקעין
        </h2>
        
        <h3 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          דירת מגורים<br />
          {getFullAddress()}
        </h3>

        {/* ✅ NEW: Property Image */}
        {data.selectedImagePreview && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img 
              src={data.selectedImagePreview} 
              alt="תמונה של הבניין"
              style={{
                maxWidth: '300px',
                maxHeight: '200px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
        )}

        {/* ✅ NEW: Report Date and Reference Number */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '20px',
          fontSize: '11pt'
        }}>
          <div>
            <strong>תאריך כתיבת השומה:</strong> {formatHebrewDate(data.valuationDate || new Date().toISOString())}
          </div>
          <div>
            <strong>סימוכין/מספר שומה:</strong> {getReferenceNumber()}
          </div>
        </div>

        {/* ✅ NEW: Client Information */}
        <div style={{ marginBottom: '20px', fontSize: '11pt' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>לכבוד מזמין השומה:</strong> {getClientName()}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>מועד הביקור בנכס:</strong> {formatDate(data.valuationEffectiveDate || new Date().toISOString())}
          </div>
          <div>
            <strong>המועד הקובע לשומה:</strong> {formatDate(data.valuationDate || new Date().toISOString())}
          </div>
        </div>

        {/* ✅ NEW: Purpose and Limitation */}
        <div style={{ marginBottom: '20px', fontSize: '11pt' }}>
          <p><strong>מטרת חוות הדעת:</strong> שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק).</p>
          <p><strong>הגבלת אחריות:</strong> אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד.</p>
        </div>
      </div>

      {/* ✅ ENHANCED: Section 1 - Property Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          1. תיאור הנכס והסביבה
        </h2>
        
        {/* ✅ NEW: Neighborhood Description (AI-generated placeholder) */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה
          </h3>
          <div className="bg-gray-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p>
              הנכס ממוקם ב{getFullAddress()}, באזור מגורים מבוקש המאופיין באיכות חיים גבוהה ונגישות מעולה לתחבורה ציבורית. 
              השכונה מציעה מגוון שירותים עירוניים, מוסדות חינוך איכותיים, מרכזי קניות ופנאי, 
              וכן קרבה לאזורי תעסוקה מרכזיים. האזור נהנה מתשתיות מפותחות, 
              כבישים רחבים ונגישות נוחה לכל חלקי העיר.
            </p>
            {/* ✅ TODO: Add GOVMAP integration here */}
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '10pt',
              color: '#666'
            }}>
              [מפת הסביבה - GOVMAP]
            </div>
          </div>
        </div>

        {/* ✅ NEW: Parcel Description */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            1.2 תיאור החלקה
          </h3>
          <div className="bg-blue-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p>
              חלקה {data.parcel || '[מספר חלקה]'} בגוש {(data as any).block || data.gush || '[מספר גוש]'}, 
              בשטח קרקע רשום של {data.parcelArea || '[שטח חלקה]'} מ"ר, 
              צורתה {data.parcelShape || '[צורת החלקה]'}, 
              פני הקרקע {data.parcelSurface || '[פני הקרקע]'}.
            </p>
            <p>
              על החלקה בניין מגורים {data.buildingDescription || '[תיאור/פירוט הבנייה]'}, 
              אשר הוקם בהתאם ל{data.constructionSource || '[מקור הבניה, שנה]'}.
            </p>
            <p>
              הבניין בן {data.buildingFloors || '[מספר קומות]'} קומות 
              {data.buildingDetails || '[ופירוט נוסף]'}, 
              וכולל {data.buildingUnits || '[מספר יח"ד]'} יח"ד.
            </p>
            {/* ✅ TODO: Add parcel boundaries and technical drawing */}
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#e8f4fd', 
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '10pt',
              color: '#666'
            }}>
              [תשריט החלקה ותצ"א - להמחשה בלבד]
            </div>
          </div>
        </div>

        {/* ✅ NEW: Property Description */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            1.3 תיאור נשוא השומה
          </h3>
          <div className="bg-green-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p>
              נשוא השומה הינה {data.subParcel || '[תיאור תת החלקה]'}, 
              המהווה {data.propertyEssence || '[מהות הנכס]'}, 
              הממוקמת בקומה {data.floor || '[קומה]'}, 
              {data.airDirections ? `פונה לכיוונים ${data.airDirections}` : ''}.
            </p>
            <p>
              הדירה בשטח רשום של {data.registeredArea || '[שטח רשום]'} מ"ר 
              (נשלף אוטומטית מנסח הטאבו), 
              ובשטח בנוי רישוי של כ-{data.builtArea || '[שטח בנוי]'} מ"ר 
              (מוזן ידנית על ידי היוזר, עפ"י מדידה גרפית ע"ג תכנית היתר בניה מס' {data.buildingPermitNumber || '[מס\' היתר]'} מיום {formatDate(data.buildingPermitDate || '')}). 
              {data.attachments ? `לדירה צמודות ${data.attachments}.` : ''}
            </p>
            <p>
              הדירה כוללת {data.rooms || '[מספר חדרים]'} חדרים, 
              {(data as any).balcony || data.balconyArea ? `מרפסת בשטח ${(data as any).balcony || data.balconyArea} מ"ר, ` : ''}
              {(data as any).parking ? 'חניה, ' : ''}
              {(data as any).elevator ? 'מעלית, ' : ''}
              {(data as any).buildingYear ? `בניין משנת ${(data as any).buildingYear}, ` : ''}
              {(data as any).buildingFloors ? `בניין בן ${(data as any) .buildingFloors} קומות, ` : ''}
              {(data as any).buildingUnits ? `כולל ${(data as any).buildingUnits} יח"ד.` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Section 2 - Legal Status */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          2. מצב משפטי – הזכויות בנכס
        </h2>
        
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            2.1 נסח רישום מקרקעין
          </h3>
          <div className="bg-yellow-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p>
              תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין {data.registryOffice || '[שם הלשכה]'} 
              (נשלף אוטומטית מהנסח), אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, 
              בתאריך {formatDate(data.extractDate || '')} (נשלף אוטומטית מהנסח).
            </p>
            <p>
              חלקה {data.parcel || '[מספר חלקה]'} בגוש {(data as any).block || data.gush || '[מספר גוש]'}, 
              בשטח קרקע רשום של {data.parcelArea || '[שטח חלקה]'} מ"ר 
              (כל הערכים נשלפים אוטומטית מהנסח).
            </p>
            
            {/* ✅ TODO: Add ownership rights, attachments, and notes extraction */}
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
              <p><strong>בעלויות:</strong> {data.ownershipRights || '[פירוט בעלויות - נשלף אוטומטית מהנסח]'}</p>
              {(data as any).attachments || data.attachments && (
                <div>
                  <p><strong>הצמדות:</strong></p>
                  <p>{(data as any).attachments || data.attachments}</p>
                </div>
              )}
              {(data as any).notes || data.notes && (
                <div>
                  <p><strong>הערות:</strong></p>
                  <p>{(data as any).notes || data.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Section 3 - Analysis with Step 3 data */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          3. ניתוח ומסקנות
        </h2>
        
        {/* Property Analysis */}
        {(data as any).propertyAnalysis && (
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
              3.1 ניתוח הנכס
            </h3>
            <div className="bg-blue-50 p-3 rounded" style={{ fontSize: '11pt' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>גיל הבניין:</strong> {(data as any).propertyAnalysis?.buildingAge || 'לא זמין'}</p>
                  <p><strong>מצב הבניין:</strong> {(data as any).propertyAnalysis?.buildingCondition || 'לא זמין'}</p>
                  <p><strong>דירוג השכונה:</strong> {(data as any).propertyAnalysis?.neighborhoodRating || 'לא זמין'}</p> 
                </div>
                <div>
                  <p><strong>נגישות:</strong> {(data as any).propertyAnalysis?.accessibility || 'לא זמין'}</p>
                  <p><strong>תחבורה ציבורית:</strong> {(data as any).propertyAnalysis?.publicTransport || 'לא זמין'}</p>
                  <p><strong>בתי ספר:</strong> {(data as any).propertyAnalysis?.schools || 'לא זמין'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Analysis */}
        {(data as any).marketAnalysis && (
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
              3.2 ניתוח שוק
            </h3>
            <div className="bg-green-50 p-3 rounded" style={{ fontSize: '11pt' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>מחיר ממוצע למ"ר:</strong> ₪{(data as any).marketAnalysis.averagePricePerSqm.toLocaleString()}</p>
                  <p><strong>טווח מחירים:</strong> {(data as any).marketAnalysis.priceRange}</p>
                  <p><strong>מגמת שוק:</strong> {(data as any).marketAnalysis.marketTrend}</p>
                </div>
                <div>
                  <p><strong>רמת ביקוש:</strong> {(data as any).marketAnalysis.demandLevel}</p>
                  <p><strong>תחרות:</strong> {(data as any).marketAnalysis.competition}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        {(data as any).riskAssessment && (
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
              3.3 הערכת סיכונים
            </h3>
            <div className="bg-yellow-50 p-3 rounded" style={{ fontSize: '11pt' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>סיכונים משפטיים:</strong> {(data as any).riskAssessment.legalRisks}</p>
                  <p><strong>סיכוני שוק:</strong> {(data as any).riskAssessment.marketRisks}</p>
                </div>
                <div>
                  <p><strong>סיכונים סביבתיים:</strong> {(data as any).riskAssessment.environmentalRisks}</p>
                  <p><strong>סיכון כולל:</strong> {(data as any).riskAssessment.overallRisk}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {(data as any).recommendations && (data as any).recommendations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
              3.4 המלצות מקצועיות
            </h3>
            <div className="bg-purple-50 p-3 rounded" style={{ fontSize: '11pt' }}>
              <ul className="space-y-1">
                {(data as any).recommendations.map((rec: any, index: any) => (
                  <li key={index} className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Fallback for when no analysis data is available */}
        {!(data as any).propertyAnalysis && !(data as any).marketAnalysis && !(data as any).riskAssessment && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 mb-1" style={{ fontSize: '12pt' }}>
              3.1 עקרונות גורמים ושיקולים
            </h3>
            <p className="text-xs" style={{ fontSize: '11pt' }}>
              הערכת השווי מבוססת על ניתוח השוואתי של נכסים דומים באזור, תוך התחשבות במאפייני הנכס, מיקומו ומצב השוק הנוכחי.
            </p>
          </div>
        )}
      </div>

      {/* ✅ ENHANCED: Section 4 - Factors and Considerations */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          4. גורמים ושיקולים באומדן השווי
        </h2>
        
        <div className="bg-gray-50 p-3 rounded" style={{ fontSize: '11pt' }}>
          <p className="mb-3">
            <strong>באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:</strong>
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-1">הסביבה והנכס</h4>
              <p>• מיקום הנכס ב{getFullAddress()}, באזור מגורים מבוקש עם איכות חיים גבוהה</p>
              <p>• נגישות מעולה לתחבורה ציבורית ושירותים עירוניים</p>
              <p>• קרבה למוסדות חינוך, מרכזי קניות ואזורי תעסוקה</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">מצב הזכויות</h4>
              <p>• הזכויות בנכס – בעלות פרטית</p>
              <p>• הדירה מזוהה בתשריט כ"{(data as any).subParcel || '[תת חלקה]'}"</p>
              <p>• {(data as any).attachments ? `כולל ${(data as any).attachments}` : 'ללא הצמדות מיוחדות'}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">מצב תכנוני ורישוי</h4>
              <p>• זכויות הבניה עפ"י תכניות בניין עיר בתוקף</p>
              <p>• {(data as any).buildingPermitNumber ? `היתר בניה מס' ${(data as any).buildingPermitNumber} מיום ${formatDate((data as any).buildingPermitDate || '')}` : 'היתר בניה רלוונטי'}</p>
              <p>• תשריט היתר ואישור מדידה צורפו למידע התכנוני</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">אומדן השווי</h4>
              <p>• הערכת שווי הנכס בוצעה בגישת ההשוואה, תוך ביצוע התאמות לשווי בהתחשב בפרמטרים ייחודיים לנכס</p>
              <p>• המחירים כוללים מע"מ, בהתאם לשוק הרלוונטי</p>
              <p>• הזכויות הוערכו כחופשיות מכל חוב, שעבוד או מחזיק</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Section 5 - Calculations */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          5. תחשיבים לאומדן השווי
        </h2>
        
        {/* Comparable Data */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            5.1 נתוני השוואה
          </h3>
          <div className="bg-blue-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p className="mb-3">
              הובאו בחשבון נתוני עסקאות מכר של נכסים דומים רלוונטיים בסביבת נכס השומה, 
              עפ״י דיווחים במערכת מידע-נדל״ן של רשות המיסים ומידע משלים מתוך היתרי הבניה.
            </p>
            
            {(data as any).comparableData && (data as any).comparableData.length > 0 ? (
              <div>
                <table className="w-full border-collapse border border-gray-300" style={{ fontSize: '10pt' }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2">כתובת</th>
                      <th className="border border-gray-300 p-2">חדרים</th>
                      <th className="border border-gray-300 p-2">קומה</th>
                      <th className="border border-gray-300 p-2">שטח (מ"ר)</th>
                      <th className="border border-gray-300 p-2">מחיר (₪)</th>
                      <th className="border border-gray-300 p-2">מחיר למ"ר (₪)</th>
                      <th className="border border-gray-300 p-2">תאריך מכירה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comparableData.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{item.address}</td>
                        <td className="border border-gray-300 p-2">{item.rooms}</td>
                        <td className="border border-gray-300 p-2">{item.floor}</td>
                        <td className="border border-gray-300 p-2">{item.area}</td>
                        <td className="border border-gray-300 p-2">{item.price?.toLocaleString()}</td>
                        <td className="border border-gray-300 p-2">{item.price_per_sqm?.toLocaleString()}</td>
                        <td className="border border-gray-300 p-2">{formatDate(item.sale_date || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-sm">
                  ממוצע מחיר למ"ר: ₪{(data as any).pricePerSqm || data.pricePerSqm?.toLocaleString() || '[חישוב]'}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">[נתוני השוואה יוצגו כאן לאחר העלאת קובץ CSV]</p>
            )}
          </div>
        </div>

        {/* Calculation Table */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2" style={{ fontSize: '12pt' }}>
            5.2 תחשיב שווי הנכס
          </h3>
          <div className="bg-green-50 p-3 rounded" style={{ fontSize: '11pt' }}>
            <p className="mb-3">
              <strong>בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, 
              שווי מ"ר בנוי אקו' לנכס נשוא השומה מוערך כ-₪{(data as any).pricePerSqm || data.pricePerSqm?.toLocaleString() || '[חישוב]'}.</strong>
            </p>
            
            <table className="w-full border-collapse border border-gray-300" style={{ fontSize: '10pt' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">תיאור הנכס</th>
                  <th className="border border-gray-300 p-2">שטח דירה בנוי (מ"ר)</th>
                  <th className="border border-gray-300 p-2">שטח מרפסות בנוי (מ"ר)</th>
                  <th className="border border-gray-300 p-2">שטח אקוו' (מ"ר)</th>
                  <th className="border border-gray-300 p-2">שווי למ"ר אקוו' (₪)</th>
                  <th className="border border-gray-300 p-2">שווי הנכס במעוגל (₪)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">{(data as any).propertyEssence || data.propertyEssence || '[תיאור הנכס]'}</td>
                  <td className="border border-gray-300 p-2">{(data as any).builtArea || data.builtArea || '[שטח בנוי]'}</td>
                  <td className="border border-gray-300 p-2">{(data as any).balcony || data.balconyArea || '0'}</td>
                  <td className="border border-gray-300 p-2">
                    {(data as any).builtArea && ((data as any).balcony || data.balconyArea) ? 
                      (parseFloat(data.builtArea as any) + (parseFloat(((data as any).balcony || data.balconyArea) as any) * 0.5)).toFixed(1) : 
                      '[חישוב]'
                    }
                  </td>
                  <td className="border border-gray-300 p-2">{(data as any).pricePerSqm || data.pricePerSqm?.toLocaleString() || '[חישוב]'}</td>
                  <td className="border border-gray-300 p-2">{(data as any).finalValuation || data.finalValuation?.toLocaleString() || '[חישוב]'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Section 6 - Final Valuation */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          6. תחשיב וסיכום שווי
        </h2>
        
        <div className="bg-yellow-50 p-4 rounded" style={{ fontSize: '12pt', lineHeight: '1.6' }}>
          <p className="mb-4">
            בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
            ובהביאי בחשבון שווים של נכסים דומים רלוונטיים,
            <strong> שווי הנכס בגבולות ₪{(data as any).finalValuation || data.finalValuation?.toLocaleString() || '[חישוב]'} ({numberToHebrewText((data as any).finalValuation || data.finalValuation || 0)} שקל).</strong>
          </p>
          <p className="mb-4">
            השווי כולל מע"מ.
          </p>
          <p>
            הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.
          </p>
        </div>
      </div>

      {/* ✅ NEW: Appraiser's Declaration */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 text-center" style={{ fontSize: '14pt' }}>
          הצהרת שמאי
        </h2>
        
        <div className="bg-gray-50 p-4 rounded" style={{ fontSize: '11pt', lineHeight: '1.6' }}>
          <p className="mb-4">
            הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.
          </p>
          <p className="mb-4">
            הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.
          </p>
          <p className="mb-4">
            ולראיה באנו על החתום,
          </p>
          
          {/* ✅ NEW: Signature Section */}
          <div className="mt-8 flex justify-between items-end">
            <div>
              <p className="mb-2"><strong>{getShamayName()}</strong></p>
              <p className="text-sm">{getShamayLicense()}</p>
            </div>
            <div className="text-center">
              {(data as any).signaturePreview || data.signaturePreview ? (
                <div>
                  <img 
                    src={(data as any).signaturePreview || data.signaturePreview} 
                    alt="חתימת שמאי"
                    style={{
                      maxWidth: '150px',
                      maxHeight: '80px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <p className="text-xs mt-1">חתימת שמאי</p>
                </div>
              ) : (
                <div style={{
                  width: '150px',
                  height: '80px',
                  border: '2px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '10pt'
                }}>
                  [חתימה]
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Professional Footer */}
      <div className="document-footer" style={{
        borderTop: '1px solid #ccc',
        paddingTop: '10px',
        marginTop: '20px',
        fontSize: '9pt',
        color: '#666',
        textAlign: 'center'
      }}>
        <p>דו"ח זה הוכן באמצעות מערכת SHAMAY.AI - פלטפורמה מקצועית להערכת שווי מקרקעין</p>
        <p>כל הזכויות שמורות © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
