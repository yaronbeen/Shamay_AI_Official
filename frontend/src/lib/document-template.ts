import { ValuationData } from '../components/ValuationWizard'

export function generateDocumentHTML(data: ValuationData, isPreview: boolean = true): string {

  // Format date as DD.MM.YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) {
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      return `${day}.${month}.${year}`;
    }
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateString;
    }
  }

  // Format Hebrew date with full month name
  const formatHebrewDate = (dateString: string) => {
    const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    
    if (!dateString) {
      const today = new Date();
      const day = today.getDate();
      const month = hebrewMonths[today.getMonth()];
      const year = today.getFullYear();
      return `${day} ב${month} ${year}`;
    }
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = hebrewMonths[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ב${month} ${year}`;
    } catch {
      return dateString;
    }
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

  const getGovMapScreenshots = () => {
    const screenshots = data.gisScreenshots

    if (!screenshots) {
      return '<div style="text-align: center; padding: 20px; color: #666; font-size: 10pt;">[מפת הסביבה - GovMap]</div>'
    }

    let html = '<div style="text-align: center; margin: 10px 0;">'
    html += '<h4 style="font-size: 11pt; font-weight: bold; margin-bottom: 10px; color: #333;">מפת הסביבה - GovMap</h4>'
    
    // Display both map modes if available
    if (screenshots.cropMode0) {
      html += '<div style="margin-bottom: 15px;">'
      html += '<p style="font-size: 9pt; color: #666; margin-bottom: 5px;">מפה נקייה (ללא תצ"א)</p>'
      html += `<img src="${screenshots.cropMode0}" alt="GovMap Screenshot - Clean Map" style="max-width: 500px; max-height: 400px; width: auto; height: auto; border: 1px solid #ddd; border-radius: 4px;" />`
      html += '</div>'
    }
    
    if (screenshots.cropMode1) {
      html += '<div style="margin-bottom: 15px;">'
      html += '<p style="font-size: 9pt; color: #666; margin-bottom: 5px;">מפה עם תצ"א (רישום מקרקעין)</p>'
      html += `<img src="${screenshots.cropMode1}" alt="GovMap Screenshot - Land Registry Map" style="max-width: 500px; max-height: 400px; width: auto; height: auto; border: 1px solid #ddd; border-radius: 4px;" />`
      html += '</div>'
    }
    
    html += '</div>'
    return html
  }

  // Hebrew number to text conversion
  const numberToHebrewText = (num: number): string => {
    const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
    const tens = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
    const hundreds = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות']

    if (num === 0) return 'אפס'
    if (num < 0) return 'מינוס ' + numberToHebrewText(-num)
    if (num > 999999999) return 'מספר גדול מדי להמרה אוטומטית'

    const convertUpTo999 = (n: number): string => {
      let result = ''
      
      // Hundreds
      if (n >= 100) {
        const hundredsPart = Math.floor(n / 100)
        result += hundreds[hundredsPart] + ' '
        n %= 100
      }
      
      // Tens and ones
      if (n >= 20) {
        const tensPart = Math.floor(n / 10)
        const onesPart = n % 10
        result += tens[tensPart]
        if (onesPart > 0) {
          result += ' ו' + ones[onesPart]
        }
      } else if (n >= 10) {
        result += tens[1]
        if (n > 10) {
          result += ' ו' + ones[n - 10]
        }
      } else if (n > 0) {
        result += ones[n]
      }
      
      return result.trim()
    }

    let result = ''
    
    // Millions (1,000,000 - 999,999,999)
    if (num >= 1000000) {
      const millionsPart = Math.floor(num / 1000000)
      if (millionsPart === 1) {
        result += 'מיליון '
      } else if (millionsPart === 2) {
        result += 'שני מיליון '
      } else {
        result += convertUpTo999(millionsPart) + ' מיליון '
      }
      num %= 1000000
    }
    
    // Thousands (1,000 - 999,999)
    if (num >= 1000) {
      const thousandsPart = Math.floor(num / 1000)
      if (thousandsPart === 1) {
        result += 'אלף '
      } else if (thousandsPart === 2) {
        result += 'אלפיים '
      } else {
        result += convertUpTo999(thousandsPart) + ' אלף '
      }
      num %= 1000
    }
    
    // Remaining (0 - 999)
    if (num > 0) {
      result += convertUpTo999(num)
    }
    
    return result.trim()
  }

  // A4 Layout with proper margins and Hebrew typography
  const containerStyle = isPreview ? `
    width: 100%;
    max-width: 210mm;
    min-height: 297mm;
    font-family: Calibri, Arial, David, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000000;
    background-color: #ffffff;
    margin: 0 auto;
    padding: 25mm 20mm;
    box-sizing: border-box;
    direction: rtl;
    text-align: right;
  ` : `
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
  `

  return `
    <div style="${containerStyle}" class="valuation-document">
      <!-- Professional Header -->
      <div class="document-header" style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 14pt; font-weight: bold;" data-field="shamayName" data-editable="true">
          ${getShamayName()}
        </div>
        <div style="font-size: 10pt;" data-field="shamaySerialNumber" data-editable="true">
          ${getShamayLicense()}
        </div>
      </div>

      <!-- Cover Page -->
      <div class="cover-page" style="margin-bottom: 30px;">
        <h1 style="font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20px; line-height: 1.3;">
          שומת מקרקעין מלאה
        </h1>

        <h3 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px;">
          דירת מגורים<br />
          ${getFullAddress()}
        </h3>

        <!-- Property Image -->
        ${data.selectedImagePreview ? `
          <div style="text-align: center; margin-bottom: 20px; display: flex; justify-content: center; align-items: center;">
            <img 
              src="${data.selectedImagePreview}" 
              alt="תמונה של הבניין"
              style="max-width: 300px; max-height: 200px; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 0 auto;"
            />
          </div>
        ` : ''}


        <!-- Report Date and Reference Number -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11pt;">
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
            <strong>לכבוד מזמין השומה:</strong> <span data-field="clientName" data-editable="true">${getClientName()}</span>
          </div>
          ${data.valuationType ? `<div style="margin-bottom: 10px;">
            <strong>סוג השומה:</strong> ${data.valuationType}
          </div>` : ''}
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

      <!-- Section 1 - Property Description -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          1. תיאור הנכס והסביבה
        </h2>

        <h2 style="font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 15px;">
          אומדן שווי זכויות במקרקעין
        </h2>

        <h3 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px;">
          דירת מגורים<br />
          ${getFullAddress()}
        </h3>



        <!-- Report Date and Reference Number -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11pt;">
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
            <strong>לכבוד מזמין השומה:</strong> <span data-field="clientName" data-editable="true">${getClientName()}</span>
          </div>
          ${data.valuationType ? `<div style="margin-bottom: 10px;">
            <strong>סוג השומה:</strong> ${data.valuationType}
          </div>` : ''}
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

      <!-- Section 1 - Property Description -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          1. תיאור הנכס והסביבה
        </h2>
        <!-- Neighborhood Description -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה
          </h3>
          <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p>
              הנכס ממוקם ב${getFullAddress()}, באזור מגורים מבוקש המאופיין באיכות חיים גבוהה ונגישות מעולה לתחבורה ציבורית. 
              השכונה מציעה מגוון שירותים עירוניים, מוסדות חינוך איכותיים, מרכזי קניות ופנאי, 
              וכן קרבה לאזורי תעסוקה מרכזיים. האזור נהנה מתשתיות מפותחות, 
              כבישים רחבים ונגישות נוחה לכל חלקי העיר.
            </p>
            <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0; border-radius: 4px; text-align: center; font-size: 10pt; color: #666;">
              ${getGovMapScreenshots()}
            </div>
          </div>
        </div>

        <!-- Parcel Description -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            1.2 תיאור החלקה
          </h3>
          <div style="background-color: #e8f4fd; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p>
              חלקה ${data?.extractedData?.chelka || '[מספר חלקה]'} בגוש ${data.extractedData?.gush || '[מספר גוש]'}, 
              בשטח קרקע רשום של ${(data?.extractedData as any)?.apartment_registered_area || (data?.extractedData as any)?.apartmentRegisteredArea || '[שטח חלקה]'} מ"ר, 
              צורתה ${data.parcelShape || '[צורת החלקה]'}, 
              פני הקרקע ${data.parcelSurface || '[פני הקרקע]'}.
            </p>
            <p>
              על החלקה בניין מגורים ${data.extractedData?.buildingDescription || data.buildingDescription || '[תיאור/פירוט הבנייה]'}, 
              אשר הוקם בהתאם ל${data.constructionSource || '[מקור הבניה, שנה]'}.
            </p>
            <p>
              הבניין בן ${data.buildingFloors || '[מספר קומות]'} קומות 
              ${data.buildingDetails || '[ופירוט נוסף]'}, 
              וכולל ${data.buildingUnits || '[מספר יח"ד]'} יח"ד.
            </p>
            <div style="margin-top: 10px; padding: 10px; background-color: #e8f4fd; border-radius: 4px; text-align: center; font-size: 10pt; color: #666;">
              [תשריט החלקה ותצ"א - להמחשה בלבד]
            </div>
          </div>
        </div>

        <!-- Property Description -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            1.3 תיאור נשוא השומה
          </h3>
          <div style="background-color: #f0f9ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p>
              נשוא השומה הינה ${data.subParcel || '[תיאור תת החלקה]'}, 
              המהווה ${data.propertyEssence || '[מהות הנכס]'}, 
              הממוקמת בקומה ${data.floor || '[קומה]'}, 
              ${data.airDirections ? `פונה לכיוונים ${data.airDirections}` : ''}.
            </p>
            <p>
              הדירה בשטח רשום של <span data-field="registeredArea" data-editable="true">${(data as any).registeredArea || '[שטח רשום]'}</span> מ"ר 
              (נשלף אוטומטית מנסח הטאבו), 
              ובשטח בנוי רישוי של כ-<span data-field="builtArea" data-editable="true">${data.extractedData?.builtArea || data.builtArea || '[שטח בנוי]'}</span> מ"ר 
              (נשלף אוטומטית מהיתר הבנייה). 
              ${data.extractedData?.attachments || data.attachments ? `לדירה צמודות ${data.extractedData?.attachments || data.attachments}.` : ''}
            </p>
            <p>
              הדירה כוללת <span data-field="rooms" data-editable="true">${data.rooms || '[מספר חדרים]'}</span> חדרים, 
              ${data.extractedData?.propertyLayoutDescription ? `
                <div style="margin-top: 10px; padding: 8px; background-color: #f0f9ff; border-radius: 4px; font-size: 10pt;">
                  <strong>תיאור תכנון הנכס (נשלף מניתוח תמונות):</strong><br/>
                  ${data.extractedData.propertyLayoutDescription}
                </div>
              ` : ''}
              ${data.extractedData?.buildingYear ? `בניין משנת ${data.extractedData.buildingYear}, ` : ''}
              ${data.extractedData?.buildingType ? `סוג בניין: ${data.extractedData.buildingType}, ` : ''}
              ${data.extractedData?.buildingCondition ? `מצב בניין: ${data.extractedData.buildingCondition}.` : ''}
            </p>
          </div>
        </div>
      </div>

      <!-- Section 2 - Legal Status -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          2. מצב משפטי – הזכויות בנכס
        </h2>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            2.1 נסח רישום מקרקעין
          </h3>
          <div style="background-color: #fff3cd; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p>
              תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${data.extractedData?.registrationOffice || data.registryOffice || '[שם הלשכה]'} 
              (נשלף אוטומטית מהנסח), אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, 
              בתאריך ${formatDate(data.extractDate || '')} (נשלף אוטומטית מהנסח).
            </p>
            <p>
              חלקה ${data.extractedData?.chelka || '[מספר חלקה]'} בגוש ${data.extractedData?.gush || '[מספר גוש]'}, 
              בשטח קרקע רשום של ${data.parcelArea || ((data.extractedData as any)?.registeredArea) || ((data as any).registeredArea) || '[שטח חלקה]'} מ"ר 
              (כל הערכים נשלפים אוטומטית מהנסח).
            </p>
            
            <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
              <p><strong>בעלויות:</strong> ${data.extractedData?.ownershipType || data.ownershipRights || '[פירוט בעלויות - נשלף אוטומטית מהנסח]'}</p>
              ${data.extractedData?.attachments || data.attachments ? `
                <div>
                  <p><strong>הצמדות:</strong></p>
                  <p>${data.extractedData?.attachments || data.attachments}</p>
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

      <!-- Section 3 - Analysis -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          3. ניתוח ומסקנות
        </h2>


        ${data.extractedData ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
              3.1 ניתוח הנכס (נשלף מניתוח AI)
            </h3>
            <div style="background-color: #e8f4fd; padding: 12px; border-radius: 4px; font-size: 11pt;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <p><strong>שנת בנייה:</strong> ${data.extractedData.buildingYear || 'לא נמצא'}</p>
                  <p><strong>מצב הנכס:</strong> ${data.extractedData.propertyCondition || 'לא נמצא'}</p>
                  <p><strong>רמת גימור:</strong> ${data.extractedData.finishLevel || 'לא נמצא'}</p>
                  <p><strong>מצב הבניין:</strong> ${data.extractedData.buildingCondition || 'לא נמצא'}</p>
                </div>
                <div>
                  <p><strong>סוג בניין:</strong> ${data.extractedData.buildingType || 'לא נמצא'}</p>
                  <p><strong>תכונות בניין:</strong> ${data.extractedData.buildingFeatures || 'לא נמצא'}</p>
                  <p><strong>שימוש מותר:</strong> ${data.extractedData.permittedUse || 'לא נמצא'}</p>
                  <p><strong>שטח בנוי:</strong> ${data.extractedData.builtArea || 'לא נמצא'} מ"ר</p>
                </div>
              </div>
              
              ${data.extractedData.propertyLayoutDescription ? `
                <div style="margin-top: 12px; padding: 8px; background-color: #f0f9ff; border-radius: 4px;">
                  <p><strong>תיאור תכנון הנכס:</strong></p>
                  <p>${data.extractedData.propertyLayoutDescription}</p>
                </div>
              ` : ''}
              
              ${data.extractedData.conditionAssessment ? `
                <div style="margin-top: 12px; padding: 8px; background-color: #f0f9ff; border-radius: 4px;">
                  <p><strong>הערכת מצב כללי:</strong></p>
                  <p>${data.extractedData.conditionAssessment}</p>
                </div>
              ` : ''}
              
              ${data.extractedData.overallAssessment ? `
                <div style="margin-top: 12px; padding: 8px; background-color: #f0f9ff; border-radius: 4px;">
                  <p><strong>הערכה כללית:</strong></p>
                  <p>${data.extractedData.overallAssessment}</p>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${data.extractedData?.averagePricePerSqm || data.extractedData?.medianPricePerSqm ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
              3.2 ניתוח שוק (נשלף מניתוח AI)
            </h3>
            <div style="background-color: #f0f9ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <p><strong>מחיר ממוצע למ"ר:</strong> ${data.extractedData.averagePricePerSqm || 'לא נמצא'}</p>
                  <p><strong>מחיר חציוני למ"ר:</strong> ${data.extractedData.medianPricePerSqm || 'לא נמצא'}</p>
                  <p><strong>גורם התאמה:</strong> ${data.extractedData.adjustmentFactor || 'לא נמצא'}</p>
                </div>
                <div>
                  <p><strong>מקור נתונים:</strong> ניתוח מכירות דומות באזור</p>
                  <p><strong>תאריך ניתוח:</strong> ${formatDate(new Date().toISOString())}</p>
                  <p><strong>רמת אמינות:</strong> גבוהה (מבוסס על נתונים אקטואליים)</p>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${data.extractedData?.roomAnalysis && data.extractedData.roomAnalysis.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
              3.3 ניתוח חדרים (נשלף מניתוח תמונות AI)
            </h3>
            <div style="background-color: #f3e8ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                ${data.extractedData.roomAnalysis.map((room: any, index: number) => `
                  <div style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; background-color: #fafafa;">
                    <p><strong>${room.room_type || 'חדר'}</strong></p>
                    <p><strong>תכונות:</strong> ${room.features || 'לא נמצא'}</p>
                    <p><strong>הערכת גודל:</strong> ${room.size_estimate || 'לא נמצא'}</p>
                    <p><strong>מצב:</strong> ${room.condition || 'לא נמצא'}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${data.riskAssessment ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
              3.3 הערכת סיכונים
            </h3>
            <div style="background-color: #fff3cd; padding: 12px; border-radius: 4px; font-size: 11pt;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
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
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
              3.4 המלצות מקצועיות
            </h3>
            <div style="background-color: #f3e8ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
              <ul style="margin: 0; padding-right: 20px;">
                ${data.recommendations.map(rec => `
                  <li style="margin-bottom: 4px; display: flex; align-items: flex-start;">
                    <span style="color: #9333ea; margin-left: 8px;">•</span>
                    <span>${rec}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        ${!data.propertyAnalysis && !data.marketAnalysis && !data.riskAssessment ? `
          <div style="margin-bottom: 8px;">
            <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 4px;">
              3.1 עקרונות גורמים ושיקולים
            </h3>
            <p style="font-size: 11pt;">
              הערכת השווי מבוססת על ניתוח השוואתי של נכסים דומים באזור, תוך התחשבות במאפייני הנכס, מיקומו ומצב השוק הנוכחי.
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Section 4 - Factors and Considerations -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          4. גורמים ושיקולים באומדן השווי
        </h2>
        
        <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; font-size: 11pt;">
          <p style="margin-bottom: 12px;">
            <strong>באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:</strong>
          </p>

          <div style="margin-bottom: 12px;">
            <div>
              <h4 style="font-weight: bold; margin-bottom: 4px;">הסביבה והנכס</h4>
              <p>• מיקום הנכס ב${getFullAddress()}, באזור מגורים מבוקש עם איכות חיים גבוהה</p>
              <p>• נגישות מעולה לתחבורה ציבורית ושירותים עירוניים</p>
              <p>• קרבה למוסדות חינוך, מרכזי קניות ואזורי תעסוקה</p>
            </div>
            
            <div>
              <h4 style="font-weight: bold; margin-bottom: 4px;">מצב הזכויות</h4>
              <p>• הזכויות בנכס – בעלות פרטית</p>
              <p>• הדירה מזוהה בתשריט כ"${data.subParcel || '[תת חלקה]'}"</p>
              <p>• ${data.attachments ? `כולל ${data.attachments}` : 'ללא הצמדות מיוחדות'}</p>
            </div>
            
            <div>
              <h4 style="font-weight: bold; margin-bottom: 4px;">מצב תכנוני ורישוי</h4>
              <p>• זכויות הבניה עפ"י תכניות בניין עיר בתוקף</p>
              <p>• ${data.buildingPermitNumber ? `היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDate(data.buildingPermitDate || '')}` : 'היתר בניה רלוונטי'}</p>
              <p>• תשריט היתר ואישור מדידה צורפו למידע התכנוני</p>
            </div>
            
            <div>
              <h4 style="font-weight: bold; margin-bottom: 4px;">אומדן השווי</h4>
              <p>• הערכת שווי הנכס בוצעה בגישת ההשוואה, תוך ביצוע התאמות לשווי בהתחשב בפרמטרים ייחודיים לנכס</p>
              <p>• המחירים כוללים מע"מ, בהתאם לשוק הרלוונטי</p>
              <p>• הזכויות הוערכו כחופשיות מכל חוב, שעבוד או מחזיק</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5 - Calculations -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          5. תחשיבים לאומדן השווי
        </h2>
        
        <!-- Comparable Data -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            5.1 נתוני השוואה
          </h3>
          <div style="background-color: #e8f4fd; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p style="margin-bottom: 12px;">
              הובאו בחשבון נתוני עסקאות מכר של נכסים דומים רלוונטיים בסביבת נכס השומה, 
              עפ״י דיווחים במערכת מידע-נדל״ן של רשות המיסים ומידע משלים מתוך היתרי הבניה.
            </p>
            
            ${data.marketAnalysis ? `
              <div>
                <!-- Market Analysis Summary -->
                ${(data as any).marketAnalysis ? `
                  <div style="background-color: #fff3e0; padding: 10px; border-radius: 4px; margin-bottom: 12px; font-size: 10pt;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                      <div>
                        <strong>מחיר ממוצע:</strong> ₪${((data as any).comparableDataAnalysis?.averagePrice || (data as any).marketAnalysis?.averagePrice || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>מחיר חציוני:</strong> ₪${((data as any).comparableDataAnalysis?.medianPrice || (data as any).marketAnalysis?.medianPrice || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>נכסים להשוואה:</strong> ${(data as any).comparableDataAnalysis?.comparables?.length || (data as any).marketAnalysis?.totalComparables || data?.comparableData.length}
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 8px;">
                      <div>
                        <strong>ממוצע למ"ר:</strong> ₪${((data as any).comparableDataAnalysis?.averagePricePerSqm || (data as any).marketAnalysis?.averagePricePerSqm || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>חציון למ"ר:</strong> ₪${((data as any).comparableDataAnalysis?.medianPricePerSqm || (data as any).marketAnalysis?.medianPricePerSqm || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>מגמת שוק:</strong> ${(data as any).marketAnalysis?.market_trends || 'יציב'}
                      </div>
                    </div>
                    ${(data as any).marketAnalysis?.price_range ? `
                      <div style="margin-top: 8px;">
                        <strong>טווח מחירים:</strong> ₪${((data as any).marketAnalysis?.price_range.min || 0).toLocaleString()} - ₪${((data as any).marketAnalysis?.price_range.max || 0).toLocaleString()}
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <!-- Comparable Data Table -->
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; font-size: 10pt;">
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="border: 1px solid #ccc; padding: 8px;">כתובת</th>
                      <th style="border: 1px solid #ccc; padding: 8px;">חדרים</th>
                      <th style="border: 1px solid #ccc; padding: 8px;">קומה</th>
                      <th style="border: 1px solid #ccc; padding: 8px;">שטח (מ"ר)</th>
                      <th style="border: 1px solid #ccc; padding: 8px;">מחיר (₪)</th>
                      <th style="border: 1px solid #ccc; padding: 8px;">מחיר למ"ר (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${((data as any).comparableData || []).slice(0, 10).map((item: any) => `
                      <tr>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.address || 'N/A'}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.rooms || 'N/A'}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.floor_number || 'N/A'}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${item.size || item.area || 'N/A'}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">₪${(item.price || 0).toLocaleString()}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">₪${(item.price_per_sqm || 0).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <p style="margin-top: 8px; font-size: 10pt; color: #666; font-style: italic;">
                  * מוצגים עד 10 נכסים מתוך ${((data as any).comparableDataAnalysis?.comparables || []).length} נכסים שנותחו
                </p>
              </div>
            ` : `
              <p style="color: #666;">[נתוני השוואה יוצגו כאן לאחר ניתוח נתוני שוק בשלב 4]</p>
            `}
          </div>
        <!-- Calculation Table -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">
            5.2 תחשיב שווי הנכס
          </h3>
          <div style="background-color: #f0f9ff; padding: 12px; border-radius: 4px; font-size: 11pt;">
            <p style="margin-bottom: 12px;">
              <strong>בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, 
              שווי מ"ר בנוי אקו' לנכס נשוא השומה מוערך כ-₪${((data as any).marketAnalysis?.avg_price_per_sqm || (data as any).marketAnalysis?.averagePricePerSqm || 0).toLocaleString()}.</strong>
            </p>
            
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; font-size: 10pt;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ccc; padding: 8px;">תיאור הנכס</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">שטח דירה בנוי (מ"ר)</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">שטח מרפסות בנוי (מ"ר)</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">שטח אקוו' (מ"ר)</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">שווי למ"ר אקוו' (₪)</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">שווי הנכס במעוגל (₪)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #ccc; padding: 8px;">${data.propertyEssence || '[תיאור הנכס]'}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${data.extractedData?.builtArea || (data as any).area || (data as any).registeredArea || '[שטח בנוי]'}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${(data.extractedData as any)?.balconyArea || (data as any).balconyArea || '0'}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">
                    ${data.extractedData?.builtArea || data.builtArea || (data as any).registeredArea ? 
                      (parseFloat(String(data.extractedData?.builtArea || data.builtArea || (data as any).registeredArea || '0')) + parseFloat(String((data.extractedData as any)?.balconyArea || (data as any).balconyArea || '0')) * 0.5).toFixed(1) : 
                      '[חישוב]'
                    }
                  </td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${(data as any).pricePerSqm?.toLocaleString() || '[חישוב]'}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${((data as any).marketAnalysis?.median_price_per_sqm || (data as any).marketAnalysis?.medianPricePerSqm || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
        </div>
      </div>
      <!-- Section 6 - Final Valuation -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          6. תחשיב וסיכום שווי
        </h2>
        
        <div style="background-color: #fff3cd; padding: 16px; border-radius: 4px; font-size: 12pt; line-height: 1.6;">
          <p style="margin-bottom: 16px;">
            בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
            ובהביאי בחשבון שווים של נכסים דומים רלוונטיים,
            <strong> שווי הנכס בגבולות ₪<span data-field="finalValuation" data-editable="true">${((data as any).comparableDataAnalysis?.estimatedValue || (data as any).comparableDataAnalysis?.medianPrice || (data as any).marketAnalysis?.estimatedValue || (data as any).marketAnalysis?.medianPrice || (data as any).finalValuation || 0).toLocaleString() || '[חישוב]'}</span> (${numberToHebrewText((data as any).comparableDataAnalysis?.estimatedValue || (data as any).comparableDataAnalysis?.medianPrice || (data as any).marketAnalysis?.estimatedValue || (data as any).marketAnalysis?.medianPrice || (data as any).finalValuation || 0)} שקל).</strong>
          </p>
          <p style="margin-bottom: 16px;">
            השווי כולל מע"מ.
          </p>
          <p>
            הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.
          </p>
      </div>

      <!-- Appraiser's Declaration -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px;">
          הצהרת שמאי
        </h2>
        
        <div style="background-color: #f9f9f9; padding: 16px; border-radius: 4px; font-size: 11pt; line-height: 1.6;">
          <p style="margin-bottom: 16px;">
            הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.
          </p>
          <p style="margin-bottom: 16px;">
            הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.
          </p>
          <p style="margin-bottom: 16px;">
            ולראיה באנו על החתום,
          </p>
          <!-- Signature Section -->
          <div style="margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <p style="margin-bottom: 8px; font-weight: bold;">${getShamayName()}</p>
              <p style="font-size: 11pt;">${getShamayLicense()}</p>
            </div>
            <div style="text-align: center;">
              ${(data.signaturePreview || data.signature) ? `
                <div style="min-height: 80px;">
                  <img 
                    src="${data.signaturePreview || data.signature}" 
                    alt="חתימת שמאי"  
                    style="max-width: 150px; max-height: 80px; border: 1px solid #ccc; display: block; margin: 0 auto;"
                    onerror="console.error('Failed to load signature image'); this.style.border='2px solid red';"
                  />
                  <p style="font-size: 10pt; margin-top: 4px;">חתימת שמאי</p>
                </div>
              ` : `
                <div style="width: 150px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666; font-size: 10pt; margin: 0 auto;">
                  [חתימה]
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
      <!-- Professional Footer -->
      <div class="document-footer" style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; font-size: 9pt; color: #666; text-align: center;">
        <p>דו"ח זה הוכן באמצעות מערכת SHAMAY.AI - פלטפורמה מקצועית להערכת שווי מקרקעין</p>
        <p>כל הזכויות שמורות © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `
}