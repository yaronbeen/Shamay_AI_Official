#!/usr/bin/env node
/**
 * Insert Mock Data from PDF 6216.6.25
 * Based on: integrations/test_documents/6216.6.25.pdf
 * 
 * This script creates a complete test case for report generation validation
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from frontend folder (or backend)
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

// Generate a unique session ID for this mock data
const SESSION_ID = `mock-6216-${Date.now()}`;

// ============================================================
// DATABASE CONNECTION HELPER
// ============================================================

function createDbConfig() {
  // Check for DATABASE_URL first (Vercel/Neon)
  if (process.env.DATABASE_URL) {
    console.log('📡 Using DATABASE_URL for connection');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }
  
  // Fallback to individual env vars
  const host = process.env.DB_HOST || 'localhost';
  const isRemote = host.includes('neon.tech') || host.includes('aws') || host.includes('cloud');
  
  console.log(`📡 Connecting to ${host} (SSL: ${isRemote})`);
  
  return {
    host: host,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shamay_land_registry',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    ssl: isRemote ? { rejectUnauthorized: false } : false
  };
}

// ============================================================
// MOCK DATA FROM PDF 6216.6.25
// ============================================================

const MOCK_DATA = {
  // Reference number from PDF
  referenceNumber: '6216.6.25',
  sessionId: SESSION_ID,
  
  // Client Info
  client: {
    name: 'עו"ד יגאל ספרבר',
    title: 'עו"ד',
    role: 'כונס הנכסים'
  },
  
  // Dates
  dates: {
    reportDate: '2025-06-29',         // 29 יוני 2025
    visitDate: '2025-06-11',          // 11 ביוני 2025
    valuationDate: '2025-06-11',      // Same as visit date
    tabuExtractDate: '2025-04-30',    // 30.4.2025
    condoOrderDate: '2003-12-08',     // 8.12.2003
    buildingPermitDate: '1994-01-04'  // 4.1.1994
  },
  
  // Address
  address: {
    street: 'הרי הגלעד',
    buildingNumber: '9',
    neighborhood: 'תל בנימין',
    city: 'רמת גן',
    fullAddress: 'רחוב הרי הגלעד 9, שכונת תל בנימין, רמת גן'
  },
  
  // Property Details
  property: {
    type: 'דירת מגורים בת 6 חדרים בקומה ה-14 בבניין',
    rooms: 6,
    floor: '14',
    gush: '6109',
    chelka: '396',
    subChelka: '118',
    registeredArea: 142.3,
    balconyArea: 40.0,
    builtArea: 164,
    airDirections: 'צפון-דרום-מערב',
    rights: 'בעלות פרטית',
    sharedProperty: '4/896',
    parcelArea: 11102,
    parcelShape: 'לא רגולרית',
    parcelSurface: 'מישורי'
  },
  
  // Attachments (הצמדות)
  attachments: [
    { type: 'מקום חניה', count: 1, area: 12.2, symbol: 'תל', color: 'חום' },
    { type: 'מקום חניה', count: 1, area: 12.2, symbol: 'תלא', color: 'חום' },
    { type: 'מחסן', count: 1, area: 6.3, symbol: 'קלח', color: 'חום' }
  ],
  
  // Building Info
  building: {
    buildingNumber: 3,
    totalBuildings: 4,
    totalUnits: 227,
    buildingUnits: [57, 18, 58, 56], // Buildings 1-4 units
    floors: 18,
    constructionYear: 1996,
    buildingPermitNumber: '9257',
    description: `הבית מורכב מ-4 מבנים: במבנה 1- 17 קומות ובו 57 דירות, במבנה 2- 18 דירות, במבנה 3- 18 קומות ובו 58 דירות ובמבנה 4- 18 קומות ובו 56 דירות. ובסה"כ 227 דירות.`,
    details: `הבניין נבנה בשנת 1996 בהיתר בניה מס' 9257 מיום 4.1.1994. מבנה 3 הינו בן 18 קומות מעל קומת עמודים מפולשת ובו 58 דירות.`
  },
  
  // Owners
  owners: [
    { name: 'מנוצהרי מרדכי', idNumber: '05919767', share: '1/2' },
    { name: 'מנוצהרי לימור', idNumber: '027925775', share: '1/2' }
  ],
  
  // Mortgages
  mortgages: [
    {
      rank: 'שניה',
      amount: 1400000,
      lenders: 'בנק מזרחי טפחות בע"מ',
      date: '2018-12-19',
      borrowers: 'מנוצהרי מרדכי'
    }
  ],
  
  // Notes
  notes: [
    { type: 'צו עיקול', date: '2021-07-25', beneficiary: 'לשכת הוצאה לפועל תל אביב', subject: 'מנוצהרי מרדכי' },
    { type: 'צו עיקול', date: '2022-06-07', beneficiary: 'לשכת הוצאה לפועל ראשון לציון', subject: 'מנוצהרי מרדכי' }
  ],
  
  // Easements (זיקות הנאה) - כל 7 הזיקות
  easements: [
    { area: 286, description: 'זכות מעבר לכלי רכב', symbol: 'א', color: 'אדום' },
    { area: 85, description: 'זכות מעבר לכלי רכב', symbol: 'ב', color: 'כחול' },
    { area: 30, description: 'זכות מעבר להולכי רגל', symbol: 'ג', color: 'אדום' },
    { area: 28, description: 'זכות מעבר להולכי רגל', symbol: 'ד', color: 'כחול' },
    { area: 45, description: 'זכות מעבר להולכי רגל', symbol: 'ה', color: 'אדום' },
    { area: 44, description: 'זכות מעבר להולכי רגל', symbol: 'ו', color: 'כחול' },
    { area: 15, description: 'זכות מעבר להולכי רגל', symbol: 'ז', color: 'אדום' }
  ],
  
  // Planning Plans (תב"עות) - כל 18 התב"עות
  planningPlans: [
    { plan_number: '506-1085653', plan_name: 'תכנית העוגנים (12118)', publication_date: '2024-02-22', status: 'בתוקף' },
    { plan_number: '6515', plan_name: 'שינוי הוראות בדירות מדרון', publication_date: '2012-12-17', status: 'בתוקף' },
    { plan_number: '5931', plan_name: 'הקטנת קו בנין קדמי ואחורי', publication_date: '2009-03-16', status: 'בתוקף' },
    { plan_number: '5837', plan_name: 'קביעת גובה מרתף', publication_date: '2008-08-05', status: 'בתוקף' },
    { plan_number: '5561', plan_name: 'שינוי לתכנית הגדלת חדרים על הגג', publication_date: '2006-07-30', status: 'בתוקף' },
    { plan_number: '5462', plan_name: 'ביטול חישוב 48 מ"ר חדר מדרגות', publication_date: '2006-02-24', status: 'בתוקף' },
    { plan_number: '5495', plan_name: 'מחסנים דירתיים', publication_date: '2006-02-16', status: 'בתוקף' },
    { plan_number: '5480', plan_name: 'הגדלת חדרי יציאה לגג', publication_date: '2006-01-12', status: 'בתוקף' },
    { plan_number: '5417', plan_name: 'משטחי חילוץ בגגות', publication_date: '2005-07-17', status: 'בתוקף' },
    { plan_number: '5293', plan_name: 'משמרת מים', publication_date: '2004-04-29', status: 'בתוקף' },
    { plan_number: '4486', plan_name: 'מעליות לבניין קיים', publication_date: '1997-01-30', status: 'בתוקף' },
    { plan_number: '4424', plan_name: 'דניה סיבוס - עסיס', publication_date: '1996-07-04', status: 'בתוקף' },
    { plan_number: '4047', plan_name: 'תכנית מרתפים', publication_date: '1992-10-08', status: 'בתוקף' },
    { plan_number: '4030', plan_name: 'תכנית 990', publication_date: '1992-08-27', status: 'בתוקף' },
    { plan_number: '3181', plan_name: 'בניה על גגות', publication_date: '1985-03-29', status: 'בתוקף' },
    { plan_number: '3543', plan_name: 'עסיס (800)', publication_date: '1988-03-15', status: 'בתוקף' },
    { plan_number: '2651', plan_name: 'הכללת אחוזי מרפסות', publication_date: '1980-08-14', status: 'בתוקף' },
    { plan_number: '2591', plan_name: 'תכנית מתאר רמת גן (340)', publication_date: '1979-12-27', status: 'בתוקף' }
  ],
  
  // Planning Rights (זכויות בנייה)
  planningRights: {
    usage: 'מגורים מיוחד',
    minLotSize: '6919',
    buildPercentage: '50%',
    maxFloors: '15 (מעל עמודים)',
    maxUnits: '55 (בחלוקה ל-31 גדולות ו-24 קטנות)',
    buildingLines: 'חזית: 5 מ\', אחורי: 20 מ\', צד צפון: 10 מ\', צד דרום: 4 מ\''
  },
  
  // GIS Analysis (גבולות החלקה)
  gisAnalysis: {
    boundary_north: 'חלקה 397 (בניין מגורים בפרויקט)',
    boundary_south: 'חלקה 399 (בניין מגורים בפרויקט)',
    boundary_east: 'חלקה 400 (בריכת שחייה) וחלקה 28 (בי"ס וגנים)',
    boundary_west: 'חזית לרחוב הרי הגלעד, גינה ציבורית'
  },
  
  // Building Permit Details
  buildingPermit: {
    permit_description: 'להקים בניין מגורים בן 15 קומות על גבי עמודים ו-2 קומות מרתף, המכיל 55 דירות (כולל דירות קוטג\' ופנטהאוז), מרפסות פתוחות, מרתפי חניה ומחסנים.',
    permitted_usage: 'מגורים'
  },
  
  // Property Details Extended
  propertyDetails: {
    propertyCondition: 'טוב מאוד',
    finishLevel: 'גבוה',
    finishDetails: 'ריצוף גרניט פורצלן ופרקט בחדרים, דלת פלדלת, חלונות אלומיניום חשמליים, מטבח מודרני עם אי, מיזוג מרכזי, יחידת הורים עם חדר רחצה.',
    propertyLayoutDescription: 'חלוקה לסלון עם יציאה למרפסת, מטבח עם פינת אוכל, 4 חדרי שינה (אחד ממ"ד), יחידת הורים מלאה, פינת טלוויזיה.'
  },
  
  // Valuation
  valuation: {
    pricePerSqm: 35000,
    totalValue: 5700000,
    equivalentArea: 162
  },
  
  // Comparable sales from PDF table
  comparables: [
    { saleDate: '2025-05-15', address: 'הרי הגלעד 11', gush: '6109', chelka: '396', rooms: 4, floor: '4', area: 108, year: 1996, price: 3850000, pricePerSqm: 35600 },
    { saleDate: '2025-03-20', address: 'הרי הגלעד 11', gush: '6109', chelka: '396', rooms: 4, floor: '10', area: 150, year: 1996, price: 5010000, pricePerSqm: 33400 },
    { saleDate: '2025-03-17', address: 'הרי הגלעד 5', gush: '6109', chelka: '396', rooms: 5, floor: '3', area: 131, year: 1996, price: 4250000, pricePerSqm: 32400 },
    { saleDate: '2024-12-24', address: 'הרי הגלעד 5', gush: '6109', chelka: '396', rooms: 5, floor: '7', area: 131, year: 1998, price: 4300000, pricePerSqm: 32800 },
    { saleDate: '2024-11-21', address: 'גלעד 11', gush: '6109', chelka: '396', rooms: 5, floor: '4', area: 139, year: 1999, price: 4900000, pricePerSqm: 35300 },
    { saleDate: '2023-04-18', address: 'גלעד 11', gush: '6109', chelka: '396', rooms: 4, floor: '6', area: 108, year: 1998, price: 3700000, pricePerSqm: 34300 },
    { saleDate: '2022-09-22', address: 'גלעד 9', gush: '6109', chelka: '396', rooms: 4, floor: '7', area: 105, year: 1996, price: 3800000, pricePerSqm: 36200 }
  ],
  
  // Internal layout description
  internalLayout: `הדירה בת 6 חדרים בתכנית צורת האות ר. בדירה 6 חדרים, הכוללים 4 חדרי שינה, סלון-כפול, מטבח, 3 חדרי רחצה + שירותים, 2 מרפסות קטנות פתוחות. הדירה נהנית מאוורור מצפון, דרום ומערב.`,
  
  // Finish standard
  finishStandard: 'רגיל',
  finishDetails: `בדירה נמצאים המטבח והמבואה במצב מקורי של הבניין, ציוד סניטרי במצב מקורי, ריצוף גרניט פורצלן ופרקט בחדרי השינה, דלתות פלדלת במצב משופץ, מזגנים עיליים.`,
  
  // Environment description
  environmentDescription: `שכונת תל בנימין שברמת גן היא אחת השכונות הוותיקות בעיר, הממוקמת בצידה הדרום-מזרחי, סמוך לגבעתיים ובקרבת מתחם הבורסה.
השכונה מאופיינת בבנייה יחסית נמוכה לצד בניינים רבי קומות, בתים פרטיים דו וחד משפחתיים.
אופי התושבים ניכן במשפחות צעירות לצד משפחות ותיקות בשכונה דבר המעניק תחושת קהילתיות וחיבור לשכונה השקטה.
בשנים האחרונות החלה באזור תנועה של התחדשות עירונית, עם פרויקטים של פינוי בינוי ותמ"א.
השכונה נהנית מנגישות גבוהה לצירי תחבורה מרכזיים ותחנת רכבת, כמו כן, קיימים בה מוסדות חינוך, פארקים קטנים, וקרבה לקניון איילון ואוניברסיטת בר אילן.`,
  
  // Appraiser info
  appraiser: {
    name: 'מני מנשה',
    serialNumber: '12345',
    company: 'מנשה-ליבוביץ שמאות מקרקעין'
  }
};

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function insertShuma(client) {
  console.log('\n📝 Inserting Shuma (Main Assessment)...');
  
  // Build attachments text
  const attachmentsText = MOCK_DATA.attachments.map(a => 
    `${a.type} בשטח ${a.area} מ"ר, מסומן בתשריט באות ${a.symbol} וצבוע בצבע ${a.color}.`
  ).join('\n');
  
  // Build ownership rights text
  const ownershipRights = MOCK_DATA.owners.map(o => 
    `${o.name} (ת.ז. ${o.idNumber}) - חלק ${o.share} בבעלות`
  ).join('\n');
  
  // Build notes text
  const notesText = [
    ...MOCK_DATA.notes.map(n => `${n.type} מיום ${n.date} לטובת ${n.beneficiary}`),
    `משכנתא דרגה ${MOCK_DATA.mortgages[0].rank} בסך ${MOCK_DATA.mortgages[0].amount.toLocaleString()} ₪ לטובת ${MOCK_DATA.mortgages[0].lenders}`
  ].join('\n');
  
  // Build comparable data JSON
  const comparableDataJson = MOCK_DATA.comparables.map(c => ({
    sale_date: c.saleDate,
    address: c.address,
    gush_chelka: `${c.gush}/${c.chelka}`,
    rooms: c.rooms,
    floor: c.floor,
    area: c.area,
    construction_year: c.year,
    price: c.price,
    price_per_sqm: c.pricePerSqm
  }));
  
  // Build complete extracted_data JSONB with ALL data
  const extractedData = {
    // Land Registry
    gush: MOCK_DATA.property.gush,
    chelka: MOCK_DATA.property.chelka,
    sub_parcel: MOCK_DATA.property.subChelka,
    registered_area: MOCK_DATA.property.registeredArea,
    registry_office: 'תל אביב- יפו',
    extract_date: MOCK_DATA.dates.tabuExtractDate,
    ownership_type: 'בעלות',
    owners: MOCK_DATA.owners.map(o => ({
      name: o.name,
      id_number: o.idNumber,
      ownership_share: o.share
    })),
    attachments: attachmentsText,
    notes: notesText,
    easements: MOCK_DATA.easements.map(e => 
      `${e.description} (${e.area} מ"ר) - ${e.color} (אות ${e.symbol})`
    ).join('\n'),
    easements_description: MOCK_DATA.easements.map(e => 
      `${e.description} (${e.area} מ"ר) - ${e.color} (אות ${e.symbol})`
    ).join('\n'),
    
    // Building Details
    building_floors: MOCK_DATA.building.floors,
    building_units: MOCK_DATA.building.totalUnits,
    building_description: MOCK_DATA.building.description,
    construction_year: MOCK_DATA.building.constructionYear,
    
    // Property Details
    propertyCondition: MOCK_DATA.propertyDetails?.propertyCondition || 'טוב מאוד',
    finishLevel: MOCK_DATA.propertyDetails?.finishLevel || 'גבוה',
    finishDetails: MOCK_DATA.propertyDetails?.finishDetails || MOCK_DATA.finishDetails,
    propertyLayoutDescription: MOCK_DATA.propertyDetails?.propertyLayoutDescription || MOCK_DATA.internalLayout,
    
    // GIS Analysis
    gis_analysis: {
      boundary_north: MOCK_DATA.gisAnalysis?.boundary_north,
      boundary_south: MOCK_DATA.gisAnalysis?.boundary_south,
      boundary_east: MOCK_DATA.gisAnalysis?.boundary_east,
      boundary_west: MOCK_DATA.gisAnalysis?.boundary_west
    },
    
    // Building Permit
    permit_number: MOCK_DATA.building.buildingPermitNumber,
    permit_date: MOCK_DATA.dates.buildingPermitDate,
    permitted_usage: MOCK_DATA.buildingPermit?.permitted_usage || 'מגורים',
    permit_description: MOCK_DATA.buildingPermit?.permit_description,
    
    // Planning Information
    planning_information: {
      plans: MOCK_DATA.planningPlans.map(p => ({
        plan_number: p.plan_number,
        plan_name: p.plan_name,
        publication_date: p.publication_date,
        status: p.status,
        description: p.plan_name,
        mehut: p.plan_name
      })),
      rights: {
        usage: MOCK_DATA.planningRights?.usage,
        minLotSize: MOCK_DATA.planningRights?.minLotSize,
        min_lot_size: MOCK_DATA.planningRights?.minLotSize,
        buildPercentage: MOCK_DATA.planningRights?.buildPercentage,
        build_percentage: MOCK_DATA.planningRights?.buildPercentage,
        maxFloors: MOCK_DATA.planningRights?.maxFloors,
        max_floors: MOCK_DATA.planningRights?.maxFloors,
        maxUnits: MOCK_DATA.planningRights?.maxUnits,
        max_units: MOCK_DATA.planningRights?.maxUnits,
        buildingLines: MOCK_DATA.planningRights?.buildingLines,
        building_lines: MOCK_DATA.planningRights?.buildingLines
      }
    },
    
    // Planning Rights (root level for backward compatibility)
    planning_rights: {
      usage: MOCK_DATA.planningRights?.usage,
      minLotSize: MOCK_DATA.planningRights?.minLotSize,
      buildPercentage: MOCK_DATA.planningRights?.buildPercentage,
      maxFloors: MOCK_DATA.planningRights?.maxFloors,
      maxUnits: MOCK_DATA.planningRights?.maxUnits,
      buildingLines: MOCK_DATA.planningRights?.buildingLines
    },
    
    // Land Contamination
    landContamination: false
  };
  
  const query = `
    INSERT INTO shuma (
      session_id,
      reference_number,
      street, building_number, city, neighborhood, full_address,
      rooms, floor, air_directions, area,
      property_essence, client_name,
      visit_date, valuation_date,
      shamay_name, shamay_serial_number,
      gush, parcel, parcel_area, parcel_shape, parcel_surface,
      sub_parcel, registered_area, built_area, balcony_area,
      building_permit_number, building_permit_date,
      building_description, building_floors, building_units, building_details, construction_source,
      attachments, ownership_rights, notes,
      registry_office, extract_date,
      internal_layout, finish_standard, finish_details,
      comparable_data, final_valuation, price_per_sqm,
      extracted_data,
      is_complete, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
      $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, NOW(), NOW()
    )
    RETURNING id;
  `;
  
  const values = [
    MOCK_DATA.sessionId,                           // 1 - session_id
    MOCK_DATA.referenceNumber,                     // 2 - reference_number
    MOCK_DATA.address.street,                      // 3 - street
    MOCK_DATA.address.buildingNumber,              // 4 - building_number
    MOCK_DATA.address.city,                        // 5 - city
    MOCK_DATA.address.neighborhood,                // 6 - neighborhood
    MOCK_DATA.address.fullAddress,                 // 7 - full_address
    MOCK_DATA.property.rooms,                      // 8 - rooms
    MOCK_DATA.property.floor,                      // 9 - floor
    MOCK_DATA.property.airDirections,              // 10 - air_directions
    MOCK_DATA.property.registeredArea,             // 11 - area
    MOCK_DATA.property.type,                       // 12 - property_essence
    MOCK_DATA.client.name,                         // 13 - client_name
    MOCK_DATA.dates.visitDate,                     // 14 - visit_date
    MOCK_DATA.dates.valuationDate,                 // 15 - valuation_date
    MOCK_DATA.appraiser.name,                      // 16 - shamay_name
    MOCK_DATA.appraiser.serialNumber,              // 17 - shamay_serial_number
    MOCK_DATA.property.gush,                       // 18 - gush
    MOCK_DATA.property.chelka,                     // 19 - parcel
    MOCK_DATA.property.parcelArea,                 // 20 - parcel_area
    MOCK_DATA.property.parcelShape,                // 21 - parcel_shape
    MOCK_DATA.property.parcelSurface,              // 22 - parcel_surface
    MOCK_DATA.property.subChelka,                  // 23 - sub_parcel
    MOCK_DATA.property.registeredArea,             // 24 - registered_area
    MOCK_DATA.property.builtArea,                  // 25 - built_area
    MOCK_DATA.property.balconyArea,                // 26 - balcony_area
    MOCK_DATA.building.buildingPermitNumber,       // 27 - building_permit_number
    MOCK_DATA.dates.buildingPermitDate,            // 28 - building_permit_date
    MOCK_DATA.buildingPermit?.permit_description || MOCK_DATA.building.description,  // 29 - building_description
    MOCK_DATA.building.floors,                     // 30 - building_floors
    MOCK_DATA.building.totalUnits,                 // 31 - building_units
    MOCK_DATA.building.details,                    // 32 - building_details
    `היתר בניה מס' ${MOCK_DATA.building.buildingPermitNumber} מיום 4.1.1994`,  // 33 - construction_source
    attachmentsText,                               // 34 - attachments
    ownershipRights,                               // 35 - ownership_rights
    notesText,                                     // 36 - notes
    'תל אביב- יפו',                               // 37 - registry_office
    MOCK_DATA.dates.tabuExtractDate,               // 38 - extract_date
    MOCK_DATA.propertyDetails?.propertyLayoutDescription || MOCK_DATA.internalLayout,  // 39 - internal_layout
    MOCK_DATA.propertyDetails?.finishLevel || MOCK_DATA.finishStandard,  // 40 - finish_standard
    MOCK_DATA.propertyDetails?.finishDetails || MOCK_DATA.finishDetails,  // 41 - finish_details
    JSON.stringify(comparableDataJson),            // 42 - comparable_data
    MOCK_DATA.valuation.totalValue,                // 43 - final_valuation
    MOCK_DATA.valuation.pricePerSqm,               // 44 - price_per_sqm
    JSON.stringify(extractedData),                 // 45 - extracted_data
    true                                           // 46 - is_complete
  ];
  
  const result = await client.query(query, values);
  console.log(`   ✅ Shuma inserted with ID: ${result.rows[0].id}`);
  return result.rows[0].id;
}

async function insertLandRegistryExtract(client, shumaId) {
  console.log('\n📜 Inserting Land Registry Extract...');
  
  const attachmentsText = MOCK_DATA.attachments.map(a => 
    `${a.type} בשטח ${a.area} מ"ר, מסומן באות ${a.symbol} וצבוע בצבע ${a.color}.`
  ).join('\n');
  
  const rawExtraction = {
    gush: MOCK_DATA.property.gush,
    parcel: MOCK_DATA.property.chelka,
    sub_parcel: MOCK_DATA.property.subChelka,
    registered_area: MOCK_DATA.property.registeredArea,
    owners: MOCK_DATA.owners,
    attachments: MOCK_DATA.attachments,
    mortgages: MOCK_DATA.mortgages,
    notes: MOCK_DATA.notes,
    easements: MOCK_DATA.easements,
    rights: MOCK_DATA.property.rights,
    shared_property: MOCK_DATA.property.sharedProperty
  };
  
  const query = `
    INSERT INTO land_registry_extracts (
      shuma_id, session_id, extracted_at,
      gush, gush_confidence,
      parcel, parcel_confidence,
      sub_parcel, sub_parcel_confidence,
      registration_office, registration_office_confidence,
      registered_area, registered_area_confidence,
      ownership_type, ownership_type_confidence,
      attachments, attachments_confidence,
      extract_date, extract_date_confidence,
      raw_extraction, processing_method
    ) VALUES (
      $1, $2, NOW(),
      $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING id;
  `;
  
  const values = [
    shumaId,                                       // 1 - shuma_id
    MOCK_DATA.sessionId,                           // 2 - session_id
    MOCK_DATA.property.gush,                       // 3 - gush
    0.95,                                          // 4 - gush_confidence
    MOCK_DATA.property.chelka,                     // 5 - parcel
    0.95,                                          // 6 - parcel_confidence
    MOCK_DATA.property.subChelka,                  // 7 - sub_parcel
    0.95,                                          // 8 - sub_parcel_confidence
    'תל אביב- יפו',                               // 9 - registration_office
    0.90,                                          // 10 - registration_office_confidence
    MOCK_DATA.property.registeredArea,             // 11 - registered_area
    0.95,                                          // 12 - registered_area_confidence
    'בעלות',                                       // 13 - ownership_type
    0.90,                                          // 14 - ownership_type_confidence
    attachmentsText,                               // 15 - attachments
    0.85,                                          // 16 - attachments_confidence
    MOCK_DATA.dates.tabuExtractDate,               // 17 - extract_date
    0.95,                                          // 18 - extract_date_confidence
    JSON.stringify(rawExtraction),                 // 19 - raw_extraction
    'mock_data'                                    // 20 - processing_method
  ];
  
  const result = await client.query(query, values);
  console.log(`   ✅ Land Registry Extract inserted with ID: ${result.rows[0].id}`);
  return result.rows[0].id;
}

async function insertSharedBuildingOrder(client, shumaId) {
  console.log('\n🏢 Inserting Shared Building Order...');
  
  const rawExtraction = {
    sub_plots: [{
      sub_plot_number: parseInt(MOCK_DATA.property.subChelka),
      building_number: MOCK_DATA.building.buildingNumber,
      area: MOCK_DATA.property.registeredArea,
      description: MOCK_DATA.property.type,
      floor: parseInt(MOCK_DATA.property.floor),
      shared_property_parts: MOCK_DATA.property.sharedProperty,
      attachments: MOCK_DATA.attachments.map(a => ({
        description: a.type,
        blueprint_marking: a.symbol,
        blueprint_color: a.color,
        area: a.area
      })),
      non_attachment_areas: `מרפסת לא מקורה בשטח ${MOCK_DATA.property.balconyArea} מ"ר`
    }],
    order_date: MOCK_DATA.dates.condoOrderDate,
    building_address: `רח' הגלעד 5,7,9,11 רמת גן`
  };
  
  const query = `
    INSERT INTO shared_building_order (
      shuma_id, session_id, extracted_at,
      building_description, building_description_confidence,
      number_of_floors, number_of_floors_confidence,
      number_of_units, number_of_units_confidence,
      common_areas, common_areas_confidence,
      raw_extraction, processing_method
    ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id;
  `;
  
  const commonAreas = `רכוש משותף: ${MOCK_DATA.property.sharedProperty}. חדר מדרגות, לובי כניסה, חצר משותפת, גינה, בריכת שחייה.`;
  
  const values = [
    shumaId,                                       // 1 - shuma_id
    MOCK_DATA.sessionId,                           // 2 - session_id
    MOCK_DATA.building.description,                // 3 - building_description
    0.92,                                          // 4 - building_description_confidence
    MOCK_DATA.building.floors,                     // 5 - number_of_floors
    0.95,                                          // 6 - number_of_floors_confidence
    MOCK_DATA.building.totalUnits,                 // 7 - number_of_units
    0.95,                                          // 8 - number_of_units_confidence
    commonAreas,                                   // 9 - common_areas
    0.85,                                          // 10 - common_areas_confidence
    JSON.stringify(rawExtraction),                 // 11 - raw_extraction
    'mock_data'                                    // 12 - processing_method
  ];
  
  const result = await client.query(query, values);
  console.log(`   ✅ Shared Building Order inserted with ID: ${result.rows[0].id}`);
  return result.rows[0].id;
}

async function insertComparableData(client, shumaId) {
  console.log('\n📊 Inserting Comparable Data (7 transactions)...');
  
  let insertedCount = 0;
  
  for (const comp of MOCK_DATA.comparables) {
    const query = `
      INSERT INTO comparable_data (
        sale_date, address, gush_chelka_sub, gush, chelka,
        rooms, floor_number, apartment_area_sqm,
        construction_year, declared_price, price_per_sqm_rounded,
        city, street_name, house_number,
        imported_by, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id;
    `;
    
    // Parse address parts
    const addressParts = comp.address.split(' ');
    const houseNumber = addressParts[addressParts.length - 1] || '';
    const streetName = comp.address.replace(` ${houseNumber}`, '') || comp.address;
    
    const values = [
      comp.saleDate,                               // 1 - sale_date
      `${comp.address}, ${MOCK_DATA.address.city}`,  // 2 - address
      `${comp.gush}/${comp.chelka}`,               // 3 - gush_chelka_sub
      parseInt(comp.gush),                         // 4 - gush
      parseInt(comp.chelka),                       // 5 - chelka
      comp.rooms,                                  // 6 - rooms
      comp.floor,                                  // 7 - floor_number
      comp.area,                                   // 8 - apartment_area_sqm
      comp.year,                                   // 9 - construction_year
      comp.price,                                  // 10 - declared_price
      comp.pricePerSqm,                            // 11 - price_per_sqm_rounded
      MOCK_DATA.address.city,                      // 12 - city
      streetName,                                  // 13 - street_name
      houseNumber,                                 // 14 - house_number
      'mock_data_script',                          // 15 - imported_by
      'active',                                    // 16 - status
      `Mock data from PDF 6216.6.25 - Shuma ID: ${shumaId}`  // 17 - notes
    ];
    
    await client.query(query, values);
    insertedCount++;
  }
  
  console.log(`   ✅ Inserted ${insertedCount} comparable transactions`);
  return insertedCount;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   📄 Inserting Mock Data from PDF 6216.6.25');
  console.log('   📍 Property: ' + MOCK_DATA.address.fullAddress);
  console.log('   💰 Valuation: ₪' + MOCK_DATA.valuation.totalValue.toLocaleString());
  console.log('   🔑 Session ID: ' + MOCK_DATA.sessionId);
  console.log('═══════════════════════════════════════════════════════════════');
  
  const dbConfig = createDbConfig();
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('\n✅ Connected to PostgreSQL database');
    
    // Insert all data
    const shumaId = await insertShuma(client);
    const landRegistryId = await insertLandRegistryExtract(client, shumaId);
    const sharedBuildingId = await insertSharedBuildingOrder(client, shumaId);
    const comparableCount = await insertComparableData(client, shumaId);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   ✅ ALL DATA INSERTED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   📝 Shuma ID: ${shumaId}`);
    console.log(`   📜 Land Registry Extract ID: ${landRegistryId}`);
    console.log(`   🏢 Shared Building Order ID: ${sharedBuildingId}`);
    console.log(`   📊 Comparable Transactions: ${comparableCount}`);
    console.log(`   🔑 Session ID: ${MOCK_DATA.sessionId}`);
    console.log(`   📋 Reference Number: ${MOCK_DATA.referenceNumber}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n🧪 You can now test report generation with this data!');
    console.log(`   Use Shuma ID: ${shumaId}`);
    console.log(`   Or Session ID: ${MOCK_DATA.sessionId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

main();
