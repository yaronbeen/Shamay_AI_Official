export type ReportData = {
  meta: {
    documentTitle: string;                 // [DocumentTitle] חובה
    reportDate: string;                    // [ReportDate] חובה (dd.mm.yyyy או "29 יוני 2025")
    referenceNumber: string;               // [ReferenceNumber] חובה
    clientName: string;                    // [ClientName] חובה
    clientTitle?: string;                   // תואר המזמין (עו"ד, וכו')
    inspectionDate: string;                // [InspectionDate] חובה
    valuationDate: string;                 // [ValuationDate] ברירת מחדל = inspectionDate
    appraiserName: string;                 // למשל "מני מנשה"
  };
  address: {
    street: string;
    buildingNumber: string;
    neighborhood?: string;
    city: string;
    fullAddressLine?: string;              // אם רוצים להזריק אחד מוכן
  };
  cover: {
    coverImage?: {                         // תמונת חזית (רשות)
      src: string;                         // base64 data uri או path
      caption?: string;
    };
    logo?: { src: string };                // Legacy field
    companyLogo?: string;                  // לוגו החברה (base64 או URL)
    footerLogo?: string;                   // לוגו לשכת שמאים (base64 או URL)
    signatureImage?: string;               // חתימה + חותמת (base64 או URL)
    companyName?: string;                   // שם החברה (למשל "מנשה-ליבוביץ שמאות מקרקעין")
    companyTagline?: string;                // שורת תגית (למשל "ליווי וייעוץ בתחום המקרקעין")
    companyServices?: string;              // שירותי החברה (למשל "שמאות מקרקעין - התחדשות עירונית - דוחות אפס וליווי פיננסי - מיסוי מקרקעין")
    companyMembership?: string;             // חברות (למשל "חבר בלשכת שמאי המקרקעין בישראל")
    companyContact?: {                     // פרטי קשר
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
    };
  };
  section1: {
    environmentDescription: string;        // 1.1 טקסט (AI/קבוע)
    environmentMap?: {                     // מפה (חובה אצלך, אבל טכנית אופציונלי)
      src: string;
      caption: string;
    };
    parcel: {
      gush: string;
      helka: string;
      parcelAreaSqm?: number;
      buildingYear?: number;
      buildingFloors?: number;
      buildingUnits?: number;
      numberOfBuildings?: number;          // מספר בניינים
      parcelSketch?: { src: string; caption: string };  // תצ"א/תשריט
      boundaries?: { west?: string; east?: string; north?: string; south?: string };
      parcelShape?: string;                // צורת החלקה
      parcelSurface?: string;              // פני הקרקע
    };
    property: {
      subParcel?: string;
      rooms: number;
      floor: number;
      airDirections?: string;              // "צפון-דרום-מערב"
      registeredAreaSqm?: number;          // 142.3
      builtAreaSqm?: number;               // 164
      balconyAreaSqm?: number;             // 40.8
      attachmentsText?: string;            // חניות/מחסן/מרפסת וכו'
      internalLayoutAndFinish: string;     // חלוקה פנימית + סטנדרט גמר
      photos?: Array<{ src: string; caption?: string }>; // >=4
    };
  };
  section2: {
    registryOfficeName?: string;           // "תל אביב-יפו"
    tabuIssueDate?: string;                // "30.4.2025"
    easementsText?: string;                // רשימת זיקות
    ownerships?: Array<{ name: string; id?: string; share: string }>;
    mortgagesText?: string;
    notesText?: string;
    condoOrder?: {
      orderDate?: string;                  // "8.12.2003"
      buildingDescription?: string;         // 4 מבנים, 227 דירות...
      subParcelDescription?: string;
      sketches?: Array<{ src: string; caption: string }>; // מרתף, קומה 14
    };
    legalDisclaimerText: string;           // טקסט קבוע של הסתייגות
  };
  section3: {
    plansTable?: Array<{ planId: string; planName: string; publishDate: string; status: string }>; // 3.1
    rightsSummary?: {
      designation?: string;
      minLotSizeSqm?: number;
      buildPercentage?: number;
      maxFloors?: number;
      maxUnits?: number;
      buildingLines?: string;
    };
    permits: Array<{
      permitNumber: string;
      permitDate: string;
      description: string;
    }>;
    completionCertificate?: {
      date: string;
      address: string;
      text?: string;
    };
    planImage?: { src: string; caption: string };        // "קטע מתכנית 990"
    apartmentPlan?: { src?: string; caption?: string };  // אם אין src -> placeholder box
    environmentQualityText: string;                      // 3.4
  };
  section4: {
    introText: string;                    // פתיח קבוע
    bullets: {
      environmentAndAsset: string[];
      rightsStatus: string[];
      planningAndPermits: string[];
      valuation: string[];
    };
  };
  section5: {
    comparablesTable: Array<{
      saleDate: string;
      address: string;
      gushHelka: string;
      rooms: number;
      floor: number;
      areaSqm: number;
      buildYear?: number;
      priceIls: number;
      pricePerSqmIls?: number;
    }>;
    valuationCalc: {
      pricePerBuiltSqmIls: number;        // 35,000
      description: string;                // "דירת 6 חד', בקומה 14..."
      builtAreaSqm: number;               // 162 (כמו בדו"ח)
      balconyAreaSqm: number;             // 40
      equityAreaSqm: number;              // "אקוו'" 142
      totalValueIls: number;              // 5,700,000
      includesVat: boolean;               // true
    };
  };
  section6: {
    finalValueIls: number;
    finalValueText: string;               // במילים
    freeFromDebtsText: string;            // "כריק, פנוי וחופשי..."
    declarationText: string;              // הצהרה
    standardsText: string;                // תקנים/אתיקה
  };
};

