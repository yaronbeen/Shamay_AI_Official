import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { A4_SPECS, PDF_STYLES } from '../../../../../lib/pdf/a4-specs'
import { formatDateHebrew, formatCurrency, numberToHebrewText } from '../../../../../lib/utils/hebrew'
import { ShumaDB } from '../../../../../lib/shumadb'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log(`📄 Generating PRODUCTION PDF for session: ${params.sessionId}`)
    
    // Load session data from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      console.error('❌ Session not found in database:', params.sessionId)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const data = loadResult.valuationData

// Add debugging and validation
console.log('📊 PDF Export - Session data:', {
  hasData: !!data,
  dataKeys: Object.keys(data),
  hasAddress: !!(data.street && data.buildingNumber && data.city),
  hasShamay: !!(data.shamayName && data.shamaySerialNumber),
  hasSignature: !!data.signaturePreview,
  signatureLength: data.signaturePreview ? data.signaturePreview.length : 0,
  signatureStart: data.signaturePreview ? data.signaturePreview.substring(0, 50) + '...' : 'Missing',
  hasPropertyImage: !!data.selectedImagePreview,
  shamayName: data.shamayName,
  shamaySerialNumber: data.shamaySerialNumber,
  signaturePreview: data.signaturePreview ? `Present (${data.signaturePreview.length} chars)` : 'Missing',
  selectedImagePreview: data.selectedImagePreview ? 'Present' : 'Missing'
})

// CRITICAL: Check if gisScreenshots exists in the session data
console.log('🚨 PDF Export - gisScreenshots check:', {
  hasGisScreenshots: !!data.gisScreenshots,
  gisScreenshotsValue: data.gisScreenshots,
  gisScreenshotsType: typeof data.gisScreenshots,
  gisScreenshotsKeys: data.gisScreenshots ? Object.keys(data.gisScreenshots) : 'N/A'
})

// Debug gisScreenshots specifically
console.log('🔍 PDF Export - gisScreenshots debug:', {
  hasGisScreenshots: !!data.gisScreenshots,
  gisScreenshotsType: typeof data.gisScreenshots,
  gisScreenshotsValue: data.gisScreenshots,
  gisScreenshotsKeys: data.gisScreenshots ? Object.keys(data.gisScreenshots) : 'N/A'
})

// If no data, return error
if (!data || Object.keys(data).length === 0) {
  console.error('❌ No session data found for PDF export')
  return NextResponse.json({ error: 'No session data found' }, { status: 400 })
}

    // Check if document has been custom edited
    let htmlContent: string
    
    if (data.isCustomEdited && data.customHTML) {
      // Use the custom HTML content that was edited by the user
      htmlContent = data.customHTML
      console.log('📝 Using custom edited HTML content')
    } else {
      // Generate HTML content using the shared template
      const { generateDocumentHTML } = await import('../../../../../lib/document-template')
      htmlContent = generateDocumentHTML(data, false)
      console.log('📝 Generated HTML from template')
    }

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

    // Wait for all images (including base64) to load
    console.log('⏳ Waiting for images to load...')
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise((resolve) => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', resolve)
            // Timeout after 5 seconds
            setTimeout(resolve, 5000)
          }))
      )
    })
    
    // Additional wait to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('✅ Images loaded, generating PDF...')
    
    // Debug: Check if signature image exists in the rendered page
    const signatureInfo = await page.evaluate(() => {
      const imgs = Array.from(document.images)
      const signatureImg = imgs.find(img => img.alt === 'חתימת שמאי')
      return {
        totalImages: imgs.length,
        hasSignatureImg: !!signatureImg,
        signatureSrc: signatureImg ? signatureImg.src.substring(0, 100) + '...' : 'Not found',
        signatureComplete: signatureImg ? signatureImg.complete : false,
        signatureWidth: signatureImg ? signatureImg.naturalWidth : 0,
        signatureHeight: signatureImg ? signatureImg.naturalHeight : 0
      }
    })
    console.log('🖼️ Signature image in rendered page:', signatureInfo)

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

async function renderDocumentContent(data: any): Promise<string> {
  // Import React and renderToString
  const React = await import('react')
  const { renderToString } = await import('react-dom/server')
  
  // Import the server-compatible DocumentContent component
  const { DocumentContentServer } = await import('../../../../../lib/document-template')
  
  // Render the DocumentContentServer component to HTML string
  const htmlString = renderToString(React.createElement(DocumentContentServer, { 
    data, 
    isPreview: false 
  }))
  
  // Return the complete HTML document with styles
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>שומת מקרקעין - ${data.street || ''} ${data.buildingNumber || ''}, ${data.city || ''}</title>
        <style>${PDF_STYLES}</style>
    </head>
    <body>
        ${htmlString}
    </body>
    </html>
  `
}

function generateProductionHTML(data: any): string {
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
        <!-- Document Header -->
        <div class="document-header">
            <div style="font-size: 14pt; font-weight: bold;">
                ${data.shamayName || 'דוד כהן, שמאי מקרקעין מוסמך'}
            </div>
            <div style="font-size: 10pt;">
                ${data.shamaySerialNumber || 'רישיון שמאי מס\' 12345'}
            </div>
        </div>

        <!-- Cover Page -->
        <div class="cover-page">
            <h1 class="cover-title">שומת מקרקעין מלאה</h1>
            <h2 class="cover-subtitle">אומדן שווי זכויות במקרקעין</h2>
            <h3 class="cover-address">
                דירת מגורים<br />
                ${getFullAddress()}
            </h3>

            ${data.selectedImagePreview ? `
            <div class="cover-image">
                <img src="${data.selectedImagePreview}" alt="תמונה של הבניין" />
            </div>
            ` : ''}

            <div class="cover-info">
                <div>
                    <strong>תאריך כתיבת השומה:</strong> ${formatDateHebrew(data.valuationDate || new Date().toISOString())}
                </div>
                <div>
                    <strong>סימוכין/מספר שומה:</strong> ${getReferenceNumber()}
                </div>
            </div>

            <div class="cover-client">
                <div style="margin-bottom: 10px;">
                    <strong>לכבוד מזמין השומה:</strong> ${data.clientName || '[שם מזמין חוות הדעת]'}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>מועד הביקור בנכס:</strong> ${formatDateHebrew(data.visitDate || new Date().toISOString())}
                </div>
                <div>
                    <strong>המועד הקובע לשומה:</strong> ${formatDateHebrew(data.valuationDate || new Date().toISOString())}
                </div>
            </div>

            <div class="cover-purpose">
                <p><strong>מטרת חוות הדעת:</strong> שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק).</p>
                <p><strong>הגבלת אחריות:</strong> אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד.</p>
            </div>
        </div>

        <!-- Section 1: Property Description -->
        <div class="section">
            <h2>1. תיאור הנכס והסביבה</h2>
            
            <div class="info-box">
                <h3>1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה</h3>
                <p>
                    הנכס ממוקם ב${getFullAddress()}, באזור מגורים מבוקש המאופיין באיכות חיים גבוהה ונגישות מעולה לתחבורה ציבורית. 
                    השכונה מציעה מגוון שירותים עירוניים, מוסדות חינוך איכותיים, מרכזי קניות ופנאי, 
                    וכן קרבה לאזורי תעסוקה מרכזיים.
                </p>
            </div>

            <div class="info-box">
                <h3>1.2 תיאור החלקה</h3>
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
            </div>

            <div class="info-box">
                <h3>1.3 תיאור נשוא השומה</h3>
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
                    (מוזן ידנית על ידי היוזר, עפ"י מדידה גרפית ע"ג תכנית היתר בניה מס' ${data.buildingPermitNumber || '[מס\' היתר]'} מיום ${formatDateHebrew(data.buildingPermitDate || '')}). 
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

        <!-- Section 2: Legal Status -->
        <div class="section">
            <h2>2. מצב משפטי – הזכויות בנכס</h2>
            
            <div class="info-box">
                <h3>2.1 נסח רישום מקרקעין</h3>
                <p>
                    תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${data.registryOffice || '[שם הלשכה]'} 
                    (נשלף אוטומטית מהנסח), אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, 
                    בתאריך ${formatDateHebrew(data.extractDate || '')} (נשלף אוטומטית מהנסח).
                </p>
                <p>
                    חלקה ${data.parcel || '[מספר חלקה]'} בגוש ${data.block || '[מספר גוש]'}, 
                    בשטח קרקע רשום של ${data.parcelArea || '[שטח חלקה]'} מ"ר.
                </p>
                <p><strong>בעלויות:</strong> ${data.ownershipRights || '[פירוט בעלויות]'}</p>
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

        <!-- Section 3: Analysis -->
        <div class="section">
            <h2>3. ניתוח ומסקנות</h2>
            
            ${data.propertyAnalysis ? `
            <div class="info-box">
                <h3>3.1 ניתוח הנכס</h3>
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
            ` : ''}

            ${data.marketAnalysis ? `
            <div class="info-box">
                <h3>3.2 ניתוח שוק</h3>
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
            ` : ''}

            ${data.riskAssessment ? `
            <div class="info-box">
                <h3>3.3 הערכת סיכונים</h3>
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
            ` : ''}

            ${data.recommendations && data.recommendations.length > 0 ? `
            <div class="info-box">
                <h3>3.4 המלצות מקצועיות</h3>
                <ul style="margin: 0; padding-right: 20px;">
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${!data.propertyAnalysis && !data.marketAnalysis && !data.riskAssessment ? `
            <div class="info-box">
                <h3>3.1 עקרונות גורמים ושיקולים</h3>
                <p style="font-size: 11pt;">
                    הערכת השווי מבוססת על ניתוח השוואתי של נכסים דומים באזור, תוך התחשבות במאפייני הנכס, מיקומו ומצב השוק הנוכחי.
                </p>
            </div>
            ` : ''}
        </div>

        <!-- Section 4: Factors and Considerations -->
        <div class="section">
            <h2>4. גורמים ושיקולים באומדן השווי</h2>
            
            <div class="info-box">
                <p><strong>באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:</strong></p>
                
                <div style="margin-top: 15px;">
                    <h4 style="font-weight: bold; margin-bottom: 8px;">הסביבה והנכס</h4>
                    <p>• מיקום הנכס ב${getFullAddress()}, באזור מגורים מבוקש עם איכות חיים גבוהה</p>
                    <p>• נגישות מעולה לתחבורה ציבורית ושירותים עירוניים</p>
                    <p>• קרבה למוסדות חינוך, מרכזי קניות ואזורי תעסוקה</p>
                </div>
                
                <div style="margin-top: 15px;">
                    <h4 style="font-weight: bold; margin-bottom: 8px;">מצב הזכויות</h4>
                    <p>• הזכויות בנכס – בעלות פרטית</p>
                    <p>• הדירה מזוהה בתשריט כ"${data.subParcel || '[תת חלקה]'}"</p>
                    <p>• ${data.attachments ? `כולל ${data.attachments}` : 'ללא הצמדות מיוחדות'}</p>
                </div>
                
                <div style="margin-top: 15px;">
                    <h4 style="font-weight: bold; margin-bottom: 8px;">מצב תכנוני ורישוי</h4>
                    <p>• זכויות הבניה עפ"י תכניות בניין עיר בתוקף</p>
                    <p>• ${data.buildingPermitNumber ? `היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateHebrew(data.buildingPermitDate || '')}` : 'היתר בניה רלוונטי'}</p>
                    <p>• תשריט היתר ואישור מדידה צורפו למידע התכנוני</p>
                </div>
                
                <div style="margin-top: 15px;">
                    <h4 style="font-weight: bold; margin-bottom: 8px;">אומדן השווי</h4>
                    <p>• הערכת שווי הנכס בוצעה בגישת ההשוואה, תוך ביצוע התאמות לשווי בהתחשב בפרמטרים ייחודיים לנכס</p>
                    <p>• המחירים כוללים מע"מ, בהתאם לשוק הרלוונטי</p>
                    <p>• הזכויות הוערכו כחופשיות מכל חוב, שעבוד או מחזיק</p>
                </div>
            </div>
        </div>

        <!-- Section 5: Calculations -->
        <div class="section">
            <h2>5. תחשיבים לאומדן השווי</h2>
            
            <div class="info-box">
                <h3>5.1 נתוני השוואה</h3>
                <p>
                    הובאו בחשבון נתוני עסקאות מכר של נכסים דומים רלוונטיים בסביבת נכס השומה, 
                    עפ״י דיווחים במערכת מידע-נדל״ן של רשות המיסים ומידע משלים מתוך היתרי הבניה.
                </p>
                
                ${data.comparableData && data.comparableData.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>כתובת</th>
                            <th>חדרים</th>
                            <th>קומה</th>
                            <th>שטח (מ"ר)</th>
                            <th>מחיר (₪)</th>
                            <th>מחיר למ"ר (₪)</th>
                            <th>תאריך מכירה</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.comparableData.slice(0, 5).map((item: any) => `
                        <tr>
                            <td>${item.address}</td>
                            <td>${item.rooms}</td>
                            <td>${item.floor}</td>
                            <td>${item.area}</td>
                            <td>${formatCurrency(item.price)}</td>
                            <td>${formatCurrency(item.price_per_sqm)}</td>
                            <td>${formatDateHebrew(item.sale_date || '')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top: 10px; font-size: 10pt;">
                    ממוצע מחיר למ"ר: ${formatCurrency(data.pricePerSqm || 0)}
                </p>
                ` : ''}
            </div>

            <div class="calculation-table">
                <h3>5.2 תחשיב שווי הנכס</h3>
                <p style="margin-bottom: 15px;">
                    <strong>בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, 
                    שווי מ"ר בנוי אקו' לנכס נשוא השומה מוערך כ-${formatCurrency(data.pricePerSqm || 0)}.</strong>
                </p>
                
                <table>
                    <thead>
                        <tr>
                            <th>תיאור הנכס</th>
                            <th>שטח דירה בנוי (מ"ר)</th>
                            <th>שטח מרפסות בנוי (מ"ר)</th>
                            <th>שטח אקוו' (מ"ר)</th>
                            <th>שווי למ"ר אקוו' (₪)</th>
                            <th>שווי הנכס במעוגל (₪)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>דירת מגורים</td>
                            <td>${data.builtArea || '[שטח בנוי]'}</td>
                            <td>${data.balconyArea || '0'}</td>
                            <td>
                                ${data.builtArea && data.balconyArea ? 
                                  (parseFloat(data.builtArea) + (parseFloat(data.balconyArea) * 0.5)).toFixed(1) : 
                                  '[חישוב]'
                                }
                            </td>
                            <td>${formatCurrency(data.pricePerSqm || 0)}</td>
                            <td>${formatCurrency(data.finalValuation || 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section 6: Final Valuation -->
        <div class="section">
            <h2>6. תחשיב וסיכום שווי</h2>
            
            <div class="final-valuation">
                <p style="margin-bottom: 20px;">
                    בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
                    ובהביאי בחשבון שווים של נכסים דומים רלוונטיים,
                    <strong> שווי הנכס בגבולות ${formatCurrency(data.finalValuation || 0)} (${numberToHebrewText(data.finalValuation || 0)} שקל).</strong>
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
        <div class="section">
            <h2>הצהרת שמאי</h2>
            
            <div class="signature-section">
                <p style="margin-bottom: 20px;">
                    הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.
                </p>
                <p style="margin-bottom: 20px;">
                    הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.
                </p>
                <p style="margin-bottom: 20px;">
                    ולראיה באנו על החתום,
                </p>
                
                <div class="signature-container">
                    <div>
                        <p style="margin-bottom: 8px; font-weight: bold;">${data.shamayName || 'דוד כהן, שמאי מקרקעין מוסמך'}</p>
                        <p style="font-size: 10pt;">${data.shamaySerialNumber || 'רישיון שמאי מס\' 12345'}</p>
                    </div>
                    <div style="text-align: center;">
                        ${data.signaturePreview ? `
                        <div>
                            <img src="${data.signaturePreview}" alt="חתימת שמאי" class="signature-image" />
                            <p style="font-size: 10pt; margin-top: 4px;">חתימת שמאי</p>
                        </div>
                        ` : `
                        <div style="width: 150px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666; font-size: 10pt;">
                            [חתימה]
                        </div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Professional Footer -->
        <div class="document-footer">
            <p>דו"ח זה הוכן באמצעות מערכת SHAMAY.AI - פלטפורמה מקצועית להערכת שווי מקרקעין</p>
            <p>כל הזכויות שמורות © ${new Date().getFullYear()}</p>
        </div>
    </body>
    </html>
  `
}
