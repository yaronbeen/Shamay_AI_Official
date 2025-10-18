import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'
import puppeteer from 'puppeteer-core'
import { A4_SPECS, PDF_STYLES } from '../../../../../lib/pdf-specs'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log(`📄 PDF Export - Session ID: ${params.sessionId}`)
    
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      console.error(`❌ Session not found: ${params.sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const data = session.data || {}

    // Add debugging and validation
    console.log('📊 PDF Export - Session data:', {
      hasData: !!data,
      dataKeys: Object.keys(data),
      hasAddress: !!(data.street && data.buildingNumber && data.city),
      hasShamay: !!(data.shamayName && data.shamaySerialNumber),
      hasSignature: !!data.signaturePreview,
      hasPropertyImage: !!data.selectedImagePreview,
      shamayName: data.shamayName,
      shamaySerialNumber: data.shamaySerialNumber,
      signaturePreview: data.signaturePreview ? 'Present' : 'Missing',
      selectedImagePreview: data.selectedImagePreview ? 'Present' : 'Missing'
    })

    // If no data, return error
    if (!data || Object.keys(data).length === 0) {
      console.error('❌ No session data found for PDF export')
      return NextResponse.json({ error: 'No session data found' }, { status: 400 })
    }

    // Generate HTML content by directly using the DocumentContent component
    const htmlContent = await generateDocumentHTML(data)

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    
    // Set A4 page size
    await page.setViewport({
      width: Math.round(A4_SPECS.pageWidth * 3.78), // Convert mm to pixels
      height: Math.round(A4_SPECS.pageHeight * 3.78)
    })

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    // Generate PDF with exact A4 specifications
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: `${A4_SPECS.margins.top}mm`,
        right: `${A4_SPECS.margins.right}mm`,
        bottom: `${A4_SPECS.margins.bottom}mm`,
        left: `${A4_SPECS.margins.left}mm`
      },
      printBackground: true,
      preferCSSPageSize: true
    })

    await browser.close()

    // Return PDF as binary response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shamay-valuation-${params.sessionId}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}

async function generateDocumentHTML(data: any): Promise<string> {
  // Create a simple HTML that directly mirrors the DocumentContent structure
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

  // Hebrew number to text conversion (same as DocumentContent)
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

  // Return the complete HTML document that exactly matches DocumentContent.tsx
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>שומת מקרקעין - ${getFullAddress()}</title>
        <style>${PDF_STYLES}</style>
    </head>
    <body>
        <div style="
            width: 210mm;
            min-height: 297mm;
            font-family: Calibri, Arial, David, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
            padding: 25mm 20mm;
            box-sizing: border-box;
            direction: rtl;
            text-align: right;
        ">
            <!-- Professional Header -->
            <div style="
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="font-size: 14pt; font-weight: bold;">
                    ${getShamayName()}
                </div>
                <div style="font-size: 10pt;">
                    ${getShamayLicense()}
                </div>
            </div>

            <!-- Cover Page -->
            <div style="margin-bottom: 30px;">
                <h1 style="
                    font-size: 18pt;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 20px;
                    line-height: 1.3;
                ">
                    שומת מקרקעין מלאה
                </h1>
                
                <h2 style="
                    font-size: 16pt;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 15px;
                ">
                    אומדן שווי זכויות במקרקעין
                </h2>
                
                <h3 style="
                    font-size: 14pt;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 20px;
                ">
                    דירת מגורים<br />
                    ${getFullAddress()}
                </h3>

                <!-- Property Image -->
                ${data.selectedImagePreview ? `
                <div style="
                    text-align: center;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                ">
                    <img 
                        src="${data.selectedImagePreview}" 
                        alt="תמונה של הבניין"
                        style="
                            max-width: 300px;
                            max-height: 200px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                            display: block;
                            margin: 0 auto;
                        "
                    />
                </div>
                ` : ''}

                <!-- Report Date and Reference Number -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 11pt;
                ">
                    <div>
                        <strong>תאריך כתיבת השומה:</strong> ${formatHebrewDate(data.valuationDate || new Date().toISOString())}
                    </div>
                    <div>
                        <strong>סימוכין/מספר שומה:</strong> ${getReferenceNumber()}
                    </div>
                </div>

                <!-- Client Information -->
                <div style="margin-bottom: 20px; font-size: 11pt;">
                    <div style="margin-bottom: 10px;">
                        <strong>לכבוד מזמין השומה:</strong> ${getClientName()}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>מועד הביקור בנכס:</strong> ${formatDate(data.visitDate || new Date().toISOString())}
                    </div>
                    <div>
                        <strong>המועד הקובע לשומה:</strong> ${formatDate(data.valuationDate || new Date().toISOString())}
                    </div>
                </div>

                <!-- Purpose and Limitation -->
                <div style="margin-bottom: 20px; font-size: 11pt;">
                    <p><strong>מטרת חוות הדעת:</strong> שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק).</p>
                    <p><strong>הגבלת אחריות:</strong> אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד.</p>
                </div>
            </div>

            <!-- Section 1: Property Description -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    1. תיאור הנכס והסביבה
                </h2>
                
                <!-- Neighborhood Description -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה
                    </h3>
                    <div style="background-color: #f9fafb; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p>
                            הנכס ממוקם ב${getFullAddress()}, באזור מגורים מבוקש המאופיין באיכות חיים גבוהה ונגישות מעולה לתחבורה ציבורית. 
                            השכונה מציעה מגוון שירותים עירוניים, מוסדות חינוך איכותיים, מרכזי קניות ופנאי, 
                            וכן קרבה לאזורי תעסוקה מרכזיים. האזור נהנה מתשתיות מפותחות, 
                            כבישים רחבים ונגישות נוחה לכל חלקי העיר.
                        </p>
                        <div style="
                            margin-top: 10px;
                            padding: 10px;
                            background-color: #f0f0f0;
                            border-radius: 4px;
                            text-align: center;
                            font-size: 10pt;
                            color: #666;
                        ">
                            [מפת הסביבה - GOVMAP]
                        </div>
                    </div>
                </div>

                <!-- Parcel Description -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        1.2 תיאור החלקה
                    </h3>
                    <div style="background-color: #eff6ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p>
                            חלקה ${data.parcel || '[מספר חלקה]'} בגוש ${data.block || '[מספר גוש]'}, 
                            בשטח קרקע רשום של ${data.parcelArea || '[שטח חלקה]'} מ"ר, 
                            צורתה ${data.parcelShape || '[צורת החלקה]'}, 
                            פני הקרקע ${data.parcelSurface || '[פני הקרקע]'}.
                        </p>
                        <p>
                            על החלקה בניין מגורים ${data.buildingDescription || '[תיאור/פירוט הבנייה]'}, 
                            אשר הוקם בהתאם ל${data.constructionSource || '[מקור הבניה, שנה]'}.
                        </p>
                        <p>
                            הבניין בן ${data.buildingFloors || '[מספר קומות]'} קומות 
                            ${data.buildingDetails || '[ופירוט נוסף]'}, 
                            וכולל ${data.buildingUnits || '[מספר יח"ד]'} יח"ד.
                        </p>
                        <div style="
                            margin-top: 10px;
                            padding: 10px;
                            background-color: #e8f4fd;
                            border-radius: 4px;
                            text-align: center;
                            font-size: 10pt;
                            color: #666;
                        ">
                            [תשריט החלקה ותצ"א - להמחשה בלבד]
                        </div>
                    </div>
                </div>

                <!-- Property Description -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        1.3 תיאור נשוא השומה
                    </h3>
                    <div style="background-color: #f0fdf4; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p>
                            נשוא השומה הינה ${data.subParcel || '[תיאור תת החלקה]'}, 
                            המהווה ${data.propertyEssence || '[מהות הנכס]'}, 
                            הממוקמת בקומה ${data.floor || '[קומה]'}, 
                            ${data.airDirections ? `פונה לכיוונים ${data.airDirections}` : ''}.
                        </p>
                        <p>
                            הדירה בשטח רשום של ${data.registeredArea || '[שטח רשום]'} מ"ר 
                            (נשלף אוטומטית מנסח הטאבו), 
                            ובשטח בנוי רישוי של כ-${data.builtArea || '[שטח בנוי]'} מ"ר 
                            (מוזן ידנית על ידי היוזר, עפ"י מדידה גרפית ע"ג תכנית היתר בניה מס' ${data.buildingPermitNumber || '[מס\' היתר]'} מיום ${formatDate(data.buildingPermitDate || '')}). 
                            ${data.attachments ? `לדירה צמודות ${data.attachments}.` : ''}
                        </p>
                        <p>
                            הדירה כוללת ${data.rooms || '[מספר חדרים]'} חדרים, 
                            ${data.balcony ? `מרפסת בשטח ${data.balcony} מ"ר, ` : ''}
                            ${data.parking ? 'חניה, ' : ''}
                            ${data.elevator ? 'מעלית, ' : ''}
                            ${data.buildingYear ? `בניין משנת ${data.buildingYear}, ` : ''}
                            ${data.buildingFloors ? `בניין בן ${data.buildingFloors} קומות, ` : ''}
                            ${data.buildingUnits ? `כולל ${data.buildingUnits} יח"ד.` : ''}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Section 2: Legal Status -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    2. מצב משפטי – הזכויות בנכס
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        2.1 נסח רישום מקרקעין
                    </h3>
                    <div style="background-color: #fefce8; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p>
                            תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${data.registryOffice || '[שם הלשכה]'} 
                            (נשלף אוטומטית מהנסח), אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, 
                            בתאריך ${formatDate(data.extractDate || '')} (נשלף אוטומטית מהנסח).
                        </p>
                        <p>
                            חלקה ${data.parcel || '[מספר חלקה]'} בגוש ${data.block || '[מספר גוש]'}, 
                            בשטח קרקע רשום של ${data.parcelArea || '[שטח חלקה]'} מ"ר 
                            (כל הערכים נשלפים אוטומטית מהנסח).
                        </p>
                        
                        <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
                            <p><strong>בעלויות:</strong> ${data.ownershipRights || '[פירוט בעלויות - נשלף אוטומטית מהנסח]'}</p>
                            ${data.attachments ? `
                            <div>
                                <p><strong>הצמדות:</strong></p>
                                <p>${data.attachments}</p>
                            </div>
                            ` : ''}
                            ${data.notes ? `
                            <div>
                                <p><strong>הערות:</strong></p>
                                <p>${data.notes}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section 3: Analysis -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    3. ניתוח ומסקנות
                </h2>
                
                ${data.propertyAnalysis ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        3.1 ניתוח הנכס
                    </h3>
                    <div style="background-color: #eff6ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <p><strong>גיל הבניין:</strong> ${data.propertyAnalysis.buildingAge}</p>
                                <p><strong>מצב הבניין:</strong> ${data.propertyAnalysis.buildingCondition}</p>
                                <p><strong>דירוג השכונה:</strong> ${data.propertyAnalysis.neighborhoodRating}</p>
                            </div>
                            <div>
                                <p><strong>נגישות:</strong> ${data.propertyAnalysis.accessibility}</p>
                                <p><strong>תחבורה ציבורית:</strong> ${data.propertyAnalysis.publicTransport}</p>
                                <p><strong>בתי ספר:</strong> ${data.propertyAnalysis.schools}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${data.marketAnalysis ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        3.2 ניתוח שוק
                    </h3>
                    <div style="background-color: #f0fdf4; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <p><strong>מחיר ממוצע למ"ר:</strong> ₪${data.marketAnalysis.averagePricePerSqm?.toLocaleString()}</p>
                                <p><strong>טווח מחירים:</strong> ${data.marketAnalysis.priceRange}</p>
                                <p><strong>מגמת שוק:</strong> ${data.marketAnalysis.marketTrend}</p>
                            </div>
                            <div>
                                <p><strong>רמת ביקוש:</strong> ${data.marketAnalysis.demandLevel}</p>
                                <p><strong>תחרות:</strong> ${data.marketAnalysis.competition}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${data.riskAssessment ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        3.3 הערכת סיכונים
                    </h3>
                    <div style="background-color: #fefce8; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <p><strong>סיכונים משפטיים:</strong> ${data.riskAssessment.legalRisks}</p>
                                <p><strong>סיכוני שוק:</strong> ${data.riskAssessment.marketRisks}</p>
                            </div>
                            <div>
                                <p><strong>סיכונים סביבתיים:</strong> ${data.riskAssessment.environmentalRisks}</p>
                                <p><strong>סיכון כולל:</strong> ${data.riskAssessment.overallRisk}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${data.recommendations && data.recommendations.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        3.4 המלצות מקצועיות
                    </h3>
                    <div style="background-color: #faf5ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <ul style="margin: 0; padding-right: 20px;">
                            ${data.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}

                ${!data.propertyAnalysis && !data.marketAnalysis && !data.riskAssessment ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        3.1 עקרונות גורמים ושיקולים
                    </h3>
                    <p style="font-size: 11pt;">
                        הערכת השווי מבוססת על ניתוח השוואתי של נכסים דומים באזור, תוך התחשבות במאפייני הנכס, מיקומו ומצב השוק הנוכחי.
                    </p>
                </div>
                ` : ''}
            </div>

            <!-- Section 4: Factors and Considerations -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    4. גורמים ושיקולים באומדן השווי
                </h2>
                
                <div style="background-color: #f9fafb; padding: 12px; border-radius: 4px; font-size: 11pt;">
                    <p style="margin-bottom: 15px;">
                        <strong>באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:</strong>
                    </p>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-weight: bold; margin-bottom: 8px;">הסביבה והנכס</h4>
                        <p>• מיקום הנכס ב${getFullAddress()}, באזור מגורים מבוקש עם איכות חיים גבוהה</p>
                        <p>• נגישות מעולה לתחבורה ציבורית ושירותים עירוניים</p>
                        <p>• קרבה למוסדות חינוך, מרכזי קניות ואזורי תעסוקה</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-weight: bold; margin-bottom: 8px;">מצב הזכויות</h4>
                        <p>• הזכויות בנכס – בעלות פרטית</p>
                        <p>• הדירה מזוהה בתשריט כ"${data.subParcel || '[תת חלקה]'}"</p>
                        <p>• ${data.attachments ? `כולל ${data.attachments}` : 'ללא הצמדות מיוחדות'}</p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-weight: bold; margin-bottom: 8px;">מצב תכנוני ורישוי</h4>
                        <p>• זכויות הבניה עפ"י תכניות בניין עיר בתוקף</p>
                        <p>• ${data.buildingPermitNumber ? `היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDate(data.buildingPermitDate || '')}` : 'היתר בניה רלוונטי'}</p>
                        <p>• תשריט היתר ואישור מדידה צורפו למידע התכנוני</p>
                    </div>
                    
                    <div>
                        <h4 style="font-weight: bold; margin-bottom: 8px;">אומדן השווי</h4>
                        <p>• הערכת שווי הנכס בוצעה בגישת ההשוואה, תוך ביצוע התאמות לשווי בהתחשב בפרמטרים ייחודיים לנכס</p>
                        <p>• המחירים כוללים מע"מ, בהתאם לשוק הרלוונטי</p>
                        <p>• הזכויות הוערכו כחופשיות מכל חוב, שעבוד או מחזיק</p>
                    </div>
                </div>
            </div>

            <!-- Section 5: Calculations -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    5. תחשיבים לאומדן השווי
                </h2>
                
                <!-- Comparable Data -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        5.1 נתוני השוואה
                    </h3>
                    <div style="background-color: #eff6ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p style="margin-bottom: 15px;">
                            הובאו בחשבון נתוני עסקאות מכר של נכסים דומים רלוונטיים בסביבת נכס השומה, 
                            עפ״י דיווחים במערכת מידע-נדל״ן של רשות המיסים ומידע משלים מתוך היתרי הבניה.
                        </p>
                        
                        ${data.comparableData && data.comparableData.length > 0 ? `
                        <div>
                            <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 10pt;">
                                <thead>
                                    <tr style="background-color: #f3f4f6;">
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">כתובת</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">חדרים</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">קומה</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">שטח (מ"ר)</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">מחיר (₪)</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">מחיר למ"ר (₪)</th>
                                        <th style="border: 1px solid #d1d5db; padding: 8px;">תאריך מכירה</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.comparableData.slice(0, 5).map((item: any) => `
                                    <tr>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.address}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.rooms}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.floor}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.area}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.price?.toLocaleString()}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${item.price_per_sqm?.toLocaleString()}</td>
                                        <td style="border: 1px solid #d1d5db; padding: 8px;">${formatDate(item.sale_date || '')}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <p style="margin-top: 10px; font-size: 10pt;">
                                ממוצע מחיר למ"ר: ₪${data.pricePerSqm?.toLocaleString() || '[חישוב]'}
                            </p>
                        </div>
                        ` : `
                        <p style="color: #6b7280;">[נתוני השוואה יוצגו כאן לאחר העלאת קובץ CSV]</p>
                        `}
                    </div>
                </div>

                <!-- Calculation Table -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
                        5.2 תחשיב שווי הנכס
                    </h3>
                    <div style="background-color: #f0fdf4; padding: 12px; border-radius: 4px; font-size: 11pt;">
                        <p style="margin-bottom: 15px;">
                            <strong>בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, 
                            שווי מ"ר בנוי אקו' לנכס נשוא השומה מוערך כ-₪${data.pricePerSqm?.toLocaleString() || '[חישוב]'}.</strong>
                        </p>
                        
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 10pt;">
                            <thead>
                                <tr style="background-color: #f3f4f6;">
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">תיאור הנכס</th>
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">שטח דירה בנוי (מ"ר)</th>
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">שטח מרפסות בנוי (מ"ר)</th>
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">שטח אקוו' (מ"ר)</th>
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">שווי למ"ר אקוו' (₪)</th>
                                    <th style="border: 1px solid #d1d5db; padding: 8px;">שווי הנכס במעוגל (₪)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">${data.propertyEssence || '[תיאור הנכס]'}</td>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">${data.builtArea || '[שטח בנוי]'}</td>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">${data.balcony || '0'}</td>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">
                                        ${data.builtArea && data.balcony ? 
                                          (parseFloat(data.builtArea) + (parseFloat(data.balcony) * 0.5)).toFixed(1) : 
                                          '[חישוב]'
                                        }
                                    </td>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">${data.pricePerSqm?.toLocaleString() || '[חישוב]'}</td>
                                    <td style="border: 1px solid #d1d5db; padding: 8px;">${data.finalValuation?.toLocaleString() || '[חישוב]'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section 6: Final Valuation -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    6. תחשיב וסיכום שווי
                </h2>
                
                <div style="background-color: #fefce8; padding: 16px; border-radius: 4px; font-size: 12pt; line-height: 1.6;">
                    <p style="margin-bottom: 20px;">
                        בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
                        ובהביאי בחשבון שווים של נכסים דומים רלוונטיים,
                        <strong> שווי הנכס בגבולות ₪${data.finalValuation?.toLocaleString() || '[חישוב]'} (${numberToHebrewText(data.finalValuation || 0)} שקל).</strong>
                    </p>
                    <p style="margin-bottom: 20px;">
                        השווי כולל מע"מ.
                    </p>
                    <p>
                        הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.
                    </p>
                </div>
            </div>

            <!-- Appraiser's Declaration -->
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
                    הצהרת שמאי
                </h2>
                
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; font-size: 11pt; line-height: 1.6;">
                    <p style="margin-bottom: 20px;">
                        הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.
                    </p>
                    <p style="margin-bottom: 20px;">
                        הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.
                    </p>
                    <p style="margin-bottom: 20px;">
                        ולראיה באנו על החתום,
                    </p>
                    
                    <!-- Signature Section -->
                    <div style="margin-top: 32px; display: flex; justify-content: space-between; align-items: end;">
                        <div>
                            <p style="margin-bottom: 8px; font-weight: bold;">${getShamayName()}</p>
                            <p style="font-size: 10pt;">${getShamayLicense()}</p>
                        </div>
                        <div style="text-align: center;">
                            ${data.signaturePreview ? `
                            <div>
                                <img 
                                    src="${data.signaturePreview}" 
                                    alt="חתימת שמאי"
                                    style="
                                        max-width: 150px;
                                        max-height: 80px;
                                        border: 1px solid #ccc;
                                    "
                                />
                                <p style="font-size: 10pt; margin-top: 4px;">חתימת שמאי</p>
                            </div>
                            ` : `
                            <div style="
                                width: 150px;
                                height: 80px;
                                border: 2px dashed #ccc;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: #666;
                                font-size: 10pt;
                            ">
                                [חתימה]
                            </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Professional Footer -->
            <div style="
                border-top: 1px solid #ccc;
                padding-top: 10px;
                margin-top: 20px;
                font-size: 9pt;
                color: #666;
                text-align: center;
            ">
                <p>דו"ח זה הוכן באמצעות מערכת SHAMAY.AI - פלטפורמה מקצועית להערכת שווי מקרקעין</p>
                <p>כל הזכויות שמורות © ${new Date().getFullYear()}</p>
            </div>
        </div>
    </body>
    </html>
  `
}
