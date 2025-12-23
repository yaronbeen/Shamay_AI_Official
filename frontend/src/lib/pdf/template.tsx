import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { ReportData } from './types';
import {
  PURPOSE_TEXT,
  LIABILITY_LIMITATION_TEXT,
  LEGAL_DISCLAIMER_TEXT,
  SECTION4_INTRO_TEXT,
  SECTION6_DECLARATION_TEXT,
  SECTION6_STANDARDS_TEXT,
  SECTION6_FREE_FROM_DEBTS_TEXT,
} from './constants';

// Register Hebrew fonts (you'll need to add font files)
// Font.register({
//   family: 'Assistant',
//   src: '/fonts/Assistant-Regular.ttf',
// });

// MMBL Color Scheme
const COLORS = {
  primary: '#1e3a8a', // Dark blue
  black: '#000000',
  gray: '#f0f0f0',
  text: '#000000',
  muted: '#666666',
};

const styles = StyleSheet.create({
  // ===== PAGE LAYOUT =====
  page: {
    padding: '56.7 56.7 70 56.7', // 2cm margins, extra bottom for footer
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.7,
    direction: 'rtl',
    textAlign: 'right',
    backgroundColor: '#ffffff',
  },
  
  // ===== HEADER (All Pages) =====
  pageHeader: {
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 10,
  },
  headerLogo: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  headerCompany: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  headerTagline: {
    fontSize: 10,
    color: COLORS.primary,
    textAlign: 'center',
  },
  
  // ===== FOOTER (All Pages) =====
  pageFooter: {
    position: 'absolute',
    bottom: 28,
    right: 56.7,
    left: 56.7,
  },
  footerServices: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'right',
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingTop: 8,
    marginBottom: 6,
  },
  footerContent: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerContact: {
    fontSize: 9,
    color: COLORS.black,
    textAlign: 'right',
  },
  footerLogo: {
    width: 50,
    height: 50,
  },
  pageNumber: {
    fontSize: 9,
    color: COLORS.black,
    textAlign: 'left',
    marginTop: 6,
  },
  
  // ===== COVER PAGE =====
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
  },
  coverHeader: {
    textAlign: 'center',
    marginBottom: 25,
  },
  coverTitleBox: {
    backgroundColor: COLORS.gray,
    borderWidth: 1,
    borderColor: COLORS.black,
    padding: 20,
    marginVertical: 20,
    width: '85%',
    textAlign: 'center',
  },
  coverTitleMain: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverTitleSub: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverTitleType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  coverAddress: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  coverImageFrame: {
    width: '85%',
    borderWidth: 1,
    borderColor: '#cccccc',
    marginVertical: 15,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 42,
    right: 56.7,
    left: 56.7,
  },
  
  // ===== CHAPTER & SECTION TITLES =====
  chapterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'right',
    textDecoration: 'underline',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'right',
    textDecoration: 'underline',
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 10,
    marginBottom: 6,
    textDecoration: 'underline',
  },
  
  // ===== LEGACY STYLES (for backward compatibility) =====
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 10,
    marginBottom: 8,
  },
  companyServices: {
    fontSize: 9,
    marginBottom: 4,
  },
  companyMembership: {
    fontSize: 9,
    marginBottom: 4,
  },
  companyContact: {
    fontSize: 8,
    marginTop: 4,
  },
  h1: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  h1Subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  h1Subtitle2: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  h2: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    textDecoration: 'underline',
    textAlign: 'right',
  },
  h3: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    textDecoration: 'underline',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
    lineHeight: 1.8,
  },
  addressBox: {
    backgroundColor: COLORS.gray,
    borderWidth: 1,
    borderColor: COLORS.black,
    padding: 15,
    marginVertical: 15,
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    marginVertical: 8,
  },
  imageCaption: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  placeholderBox: {
    width: 140,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  placeholderText: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  // ===== TABLES - Clean Professional Style =====
  table: {
    width: '100%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
  },
  tableHeader: {
    backgroundColor: COLORS.gray,
    fontWeight: 'bold',
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: COLORS.black,
    flex: 1,
    textAlign: 'right',
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.black,
    flex: 1,
    textAlign: 'right',
  },
  
  // ===== LISTS =====
  bulletList: {
    marginRight: 10,
    marginBottom: 8,
  },
  bulletItem: {
    marginBottom: 4,
    flexDirection: 'row',
    textAlign: 'right',
  },
  bulletDash: {
    marginLeft: 8,
    fontSize: 10,
  },
  
  // ===== IMAGES & MEDIA =====
  imageGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  imageGridItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cccccc',
    marginBottom: 10,
  },
  sideBySideImages: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 10,
  },
  sideBySideImage: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  
  // ===== VALUATION =====
  valuationFinal: {
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  valuationAmount: {
    textDecoration: 'underline',
  },
  
  // ===== SIGNATURE =====
  signatureBox: {
    marginTop: 50,
    textAlign: 'left',
  },
  signatureImage: {
    maxWidth: 180,
    maxHeight: 100,
    marginTop: 20,
  },
  
  // ===== UTILITY =====
  requiredFieldMissing: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  boldText: {
    fontWeight: 'bold',
  },
  footnote: {
    fontSize: 9,
    color: COLORS.black,
    marginTop: 15,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.black,
  },
  boundaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  boundaryDirection: {
    fontWeight: 'bold',
    width: 50,
  },
});

// Helper function to format numbers with commas
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '—';
  return num.toLocaleString('he-IL');
};

// Helper function to format currency
const formatCurrency = (num: number | undefined): string => {
  if (num === undefined || num === null) return '—';
  return `₪${num.toLocaleString('he-IL')}`;
};

// Placeholder component for missing images
const ImagePlaceholder: React.FC<{ caption?: string }> = ({ caption }) => (
  <View style={styles.placeholderBox}>
    <Text style={styles.placeholderText}>
      {caption || 'הדבק כאן צילום-מסך תשריט הדירה'}
    </Text>
  </View>
);

// Cover Page Component - MMBL Style
const CoverPage: React.FC<{ data: ReportData }> = ({ data }) => {
  const fullAddress = data.address.fullAddressLine || 
    `רחוב ${data.address.street} ${data.address.buildingNumber}${data.address.neighborhood ? `שכונת ${data.address.neighborhood}` : ''}, ${data.address.city}`;

  return (
    <Page size="A4" style={styles.page}>
      {/* Cover Header with Logo */}
      <View style={styles.coverHeader}>
        <View style={{ alignItems: 'center' }}>
          {data.cover.companyLogo ? (
            <Image src={data.cover.companyLogo} style={{ maxHeight: 80 }} />
          ) : (
            <>
              <Text style={styles.headerLogo}>MMBL.</Text>
              <Text style={styles.headerCompany}>{data.cover.companyName || 'מנשה-ליבוביץ שמאות מקרקעין'}</Text>
              <Text style={styles.headerTagline}>{data.cover.companyTagline || 'ליווי וייעוץ בתחום המקרקעין'}</Text>
            </>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.coverPage}>
        {/* Title Box with Gray Background */}
        <View style={styles.coverTitleBox}>
          <Text style={styles.coverTitleMain}>חוות דעת בעניין</Text>
          <Text style={styles.coverTitleSub}>אומדן שווי זכויות במקרקעין</Text>
          <Text style={styles.coverTitleType}>דירת מגורים</Text>
          <Text style={styles.coverAddress}>{fullAddress}</Text>
        </View>
        
        {/* Cover Image */}
        {data.cover.coverImage ? (
          <View style={styles.coverImageFrame}>
            <Image src={data.cover.coverImage.src} style={{ width: '100%' }} />
        </View>
        ) : (
          <View style={[styles.coverImageFrame, { padding: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }]}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📷</Text>
            <Text style={{ color: '#999' }}>תמונה חיצונית לא הועלתה</Text>
          </View>
        )}
      </View>

      {/* Cover Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.footerServices}>
          {data.cover.companyServices || 'שמאות מקרקעין - התחדשות עירונית - דוחות אפס וליווי פיננסי - מיסוי מקרקעין'}
        </Text>
        <View style={styles.footerContent}>
          <View style={styles.footerContact}>
            {data.cover.companyContact?.phone && (
              <Text>טלפון: {data.cover.companyContact.phone} | דוא"ל: {data.cover.companyContact.email || ''}</Text>
            )}
            {data.cover.companyContact?.address && (
              <Text>כתובת משרדנו: {data.cover.companyContact.address}</Text>
            )}
            {data.cover.companyContact?.website && (
              <Text>{data.cover.companyContact.website}</Text>
            )}
          </View>
          {data.cover.footerLogo && (
            <Image src={data.cover.footerLogo} style={styles.footerLogo} />
        )}
        </View>
      </View>
    </Page>
  );
};

// Page 2 - Client Details - Based on 6216.6.25.pdf structure
const ClientDetailsPage: React.FC<{ data: ReportData }> = ({ data }) => {
  const fullAddress = data.address.fullAddressLine || 
    `${data.address.street} ${data.address.buildingNumber}${data.address.neighborhood ? `שכונת ${data.address.neighborhood}` : ''}, ${data.address.city}`;

  return (
    <Page size="A4" style={styles.page}>
      {/* Header with date and reference */}
      <View style={{ position: 'absolute', top: 56.7, right: 56.7, left: 56.7, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11 }}>תאריך: {data.meta.reportDate}</Text>
        <Text style={{ fontSize: 11 }}>סימנון: {data.meta.referenceNumber}</Text>
      </View>

      {/* Company Header */}
      <View style={{ marginTop: 30, marginBottom: 20 }}>
        {data.cover.companyName && (
          <Text style={styles.companyName}>{data.cover.companyName}</Text>
        )}
        {data.cover.companyTagline && (
          <Text style={styles.companyTagline}>{data.cover.companyTagline}</Text>
        )}
      </View>

      {/* Client Name */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 11 }}>
          לכבוד{data.meta.clientTitle ? `, ${data.meta.clientTitle}` : ''} {data.meta.clientName}
        </Text>
      </View>

      {/* Title Section */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.h1}>חוות דעת בעניין</Text>
        <Text style={styles.h1Subtitle}>אומדן שווי זכויות במקרקעין</Text>
        <Text style={styles.h1Subtitle2}>דירת מגורים</Text>
        <Text style={{ fontSize: 12, marginTop: 8 }}>{fullAddress}</Text>
      </View>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        נתבקשתי לאמוד את שווי הזכויות בנכס שבגדון. לצורך הכנת השומה נערך ביקור בנכס נערך סקר מחירי שוק, ולהלן חוות הדעת:
      </Text>

      {/* Purpose */}
      <Text style={{ ...styles.paragraph, fontWeight: 'bold', marginTop: 15 }}>
        מטרת חוות הדעת:
      </Text>
      <Text style={styles.paragraph}>
        {PURPOSE_TEXT}
      </Text>

      {/* Liability */}
      <Text style={styles.paragraph}>
        {LIABILITY_LIMITATION_TEXT}
      </Text>

      {/* Client Details */}
      <Text style={{ ...styles.paragraph, fontWeight: 'bold', marginTop: 15 }}>
        מזמין חוות הדעת:
      </Text>
      <Text style={styles.paragraph}>
       {data.meta.clientTitle ? `${data.meta.clientTitle} ` : ''}{data.meta.clientName}.
      </Text>

      {/* Visit Date */}
      <Text style={{ ...styles.paragraph, fontWeight: 'bold', marginTop: 10 }}>
        מועד הביקור בנכס:
      </Text>
      <Text style={styles.paragraph}>
        {data.meta.inspectionDate}, על ידי {data.meta.appraiserName}, שמאי מקרקעין. לביקור התלוותה בעלת הזכויות בנכס.
      </Text>

      {/* Valuation Date */}
      <Text style={{ ...styles.paragraph, fontWeight: 'bold', marginTop: 10 }}>
        תאריך קובע לשומה:
      </Text>
      <Text style={styles.paragraph}>
        {data.meta.valuationDate}, מועד הביקור בנכס.
      </Text>

      {/* Property Details Table */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ ...styles.paragraph, fontWeight: 'bold', marginBottom: 10 }}>
          פרטי הנכס:
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>מהות:</Text>
            <Text style={styles.tableCell}>דירת מגורים בת {data.section1.property.rooms} חדרים בקומה ה-{data.section1.property.floor} בבניין</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>גוש:</Text>
            <Text style={styles.tableCell}>{data.section1.parcel.gush}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>חלקה:</Text>
            <Text style={styles.tableCell}>{data.section1.parcel.helka}</Text>
          </View>
          {data.section1.property.subParcel && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>תת חלקה:</Text>
              <Text style={styles.tableCell}>{data.section1.property.subParcel}</Text>
            </View>
          )}
          {data.section1.property.attachmentsText && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>הצמדות:</Text>
              <Text style={styles.tableCell}>{data.section1.property.attachmentsText}</Text>
            </View>
          )}
          {data.section1.property.registeredAreaSqm && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>שטח דירה רשום:</Text>
              <Text style={styles.tableCell}>{formatNumber(data.section1.property.registeredAreaSqm)} מ"ר{data.section1.property.balconyAreaSqm ? ` + ${formatNumber(data.section1.property.balconyAreaSqm)} מ"ר מרפסת לא מקורה` : ''}</Text>
            </View>
          )}
          {data.section1.property.builtAreaSqm && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>שטח דירה בנוי:</Text>
              <Text style={styles.tableCell}>כ-{formatNumber(data.section1.property.builtAreaSqm)} מ"ר</Text>
            </View>
          )}
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>זכויות:</Text>
            <Text style={styles.tableCell}>בעלות פרטית</Text>
          </View>
        </View>
      </View>
    </Page>
  );
};

// Section 1 - Property Description
const Section1: React.FC<{ data: ReportData }> = ({ data }) => {
  const parcel = data.section1.parcel;
  const property = data.section1.property;
  
  const parcelText = parcel.numberOfBuildings && parcel.numberOfBuildings > 1
    ? `חלקה ${parcel.helka} בגוש ${parcel.gush}, בשטח קרקע רשום של ${formatNumber(parcel.parcelAreaSqm)} מ"ר${parcel.parcelShape ? `, צורתה ${parcel.parcelShape}` : ''}${parcel.parcelSurface ? `, פני הקרקע ${parcel.parcelSurface}` : ''}.\nעל החלקה ${parcel.numberOfBuildings} בנייני מגורים${parcel.buildingYear ? `, אשר הוקמו בהתאם ל${parcel.buildingYear}` : ''}.\nהבניינים בני ${parcel.buildingFloors || '—'} קומות${parcel.buildingUnits ? `, כל אחד כולל ${parcel.buildingUnits} יח"ד` : ''}.`
    : `חלקה ${parcel.helka} בגוש ${parcel.gush}, בשטח קרקע רשום של ${formatNumber(parcel.parcelAreaSqm)} מ"ר${parcel.parcelShape ? `, צורתה ${parcel.parcelShape}` : ''}${parcel.parcelSurface ? `, פני הקרקע ${parcel.parcelSurface}` : ''}.\nעל החלקה בניין מגורים${parcel.buildingYear ? `, אשר הוקם בהתאם ל${parcel.buildingYear}` : ''}.\nהבניין בן ${parcel.buildingFloors || '—'} קומות${parcel.buildingUnits ? ` וכולל ${parcel.buildingUnits} יח"ד` : ''}.`;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>1. תיאור הנכס והסביבה</Text>
      
      <Text style={styles.h3}>1.1 הסביבה והקשר העירוני</Text>
      <Text style={styles.paragraph}>
        {data.section1.environmentDescription || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: תיאור סביבה</Text>}
      </Text>
      
      {data.section1.environmentMap ? (
        <View>
          <Image src={data.section1.environmentMap.src} style={styles.image} />
          <Text style={styles.imageCaption}>{data.section1.environmentMap.caption}</Text>
        </View>
      ) : (
        <ImagePlaceholder caption="מפת סביבה" />
      )}

      <Text style={styles.h3}>1.2 תיאור החלקה והבניין</Text>
      <Text style={styles.paragraph}>{parcelText}</Text>
      
      {parcel.parcelSketch ? (
        <View>
          <Image src={parcel.parcelSketch.src} style={styles.image} />
          <Text style={styles.imageCaption}>{parcel.parcelSketch.caption}</Text>
        </View>
      ) : (
        <ImagePlaceholder caption={'תשריט חלקה / תצלום תצ"א'} />
      )}

      {parcel.boundaries && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.paragraph}>גבולות החלקה:</Text>
          {parcel.boundaries.west && <Text style={styles.paragraph}>מערב – {parcel.boundaries.west}</Text>}
          {parcel.boundaries.north && <Text style={styles.paragraph}>צפון – {parcel.boundaries.north}</Text>}
          {parcel.boundaries.east && <Text style={styles.paragraph}>מזרח – {parcel.boundaries.east}</Text>}
          {parcel.boundaries.south && <Text style={styles.paragraph}>דרום – {parcel.boundaries.south}</Text>}
        </View>
      )}

      <Text style={styles.h3}>1.3 תיאור נשוא השומה</Text>
      <Text style={styles.paragraph}>
        נשוא השומה הינה {property.subParcel ? `תת חלקה ${property.subParcel}` : <Text style={styles.requiredFieldMissing}>שדה חובה חסר: תת חלקה</Text>}, המהווה דירת מגורים בת {property.rooms || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: מספר חדרים</Text>} חדרים{property.airDirections ? ` עם ${property.airDirections} כיווני אוויר` : ''}, הממוקמת בקומה {property.floor || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: קומה</Text>}.
      </Text>
      
      <Text style={styles.paragraph}>
        הדירה בשטח רשום של {formatNumber(property.registeredAreaSqm)} מ"ר{property.builtAreaSqm ? `, ובשטח בנוי רישוי של כ-${formatNumber(property.builtAreaSqm)} מ"ר` : ''}{property.attachmentsText ? `. לדירה צמודות ${property.attachmentsText}` : ''}.
      </Text>
      
      <Text style={styles.paragraph}>
        הדירה בחלוקה פנימית: {property.internalLayoutAndFinish || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: חלוקה פנימית</Text>}
      </Text>

      {property.photos && property.photos.length > 0 && (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.h3}>תמונות אופייניות</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {property.photos.slice(0, 4).map((photo, idx) => (
              <View key={idx} style={{ width: '48%' }}>
                <Image src={photo.src} style={{ width: '100%', maxHeight: 150 }} />
                {photo.caption && <Text style={styles.imageCaption}>{photo.caption}</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </Page>
  );
};

// Section 2 - Legal Status
const Section2: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.h2}>2. מצב משפטי</Text>
    
    <Text style={styles.h3}>2.1 נסח רישום מקרקעין</Text>
    <Text style={styles.paragraph}>
      תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין {data.section2.registryOfficeName || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: שם הלשכה</Text>}, אשר הופק בתאריך {data.section2.tabuIssueDate || <Text style={styles.requiredFieldMissing}>שדה חובה חסר: תאריך הפקת נסח</Text>}.
    </Text>
    <Text style={styles.paragraph}>
      חלקה {data.section1.parcel.helka || '—'} בגוש {data.section1.parcel.gush || '—'}, בשטח קרקע רשום של {formatNumber(data.section1.parcel.parcelAreaSqm)} מ"ר.
    </Text>

    {data.section2.ownerships && data.section2.ownerships.length > 0 && (
      <View style={{ marginTop: 10 }}>
        <Text style={styles.h3}>בעלויות</Text>
        {data.section2.ownerships.map((owner, idx) => (
          <Text key={idx} style={styles.paragraph}>
            {owner.name}{owner.id ? `, ${owner.id}` : ''}{owner.share ? `, חלק בנכס – ${owner.share}` : ''}
          </Text>
        ))}
      </View>
    )}

    {data.section2.condoOrder && (
      <View style={{ marginTop: 15 }}>
        <Text style={styles.h3}>2.2 מסמכי בית משותף</Text>
        <Text style={styles.paragraph}>
          מעיון בצו רישום הבית המשותף מיום {data.section2.condoOrder.orderDate || '—'} עולים הפרטים הרלוונטיים הבאים:
        </Text>
        {data.section2.condoOrder.buildingDescription && (
          <Text style={styles.paragraph}>{data.section2.condoOrder.buildingDescription}</Text>
        )}
        
        {data.section2.condoOrder.sketches && data.section2.condoOrder.sketches.length > 0 && (
          <View style={{ marginTop: 10 }}>
            {data.section2.condoOrder.sketches.map((sketch, idx) => (
              <View key={idx}>
                <Image src={sketch.src} style={styles.image} />
                <Text style={styles.imageCaption}>{sketch.caption}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )}

    <Text style={{ marginTop: 20, fontSize: 10, fontStyle: 'italic' }}>
      {LEGAL_DISCLAIMER_TEXT}
    </Text>
  </Page>
);

// Section 3 - Planning Information
const Section3: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.h2}>3. מידע תכנוני / רישוי</Text>
    
    {data.section3.plansTable && data.section3.plansTable.length > 0 && (
      <View style={{ marginBottom: 15 }}>
        <Text style={styles.h3}>3.1 ריכוז תכניות בניין עיר תקפות</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>מספר תכנית</Text>
            <Text style={styles.tableCell}>שם תכנית</Text>
            <Text style={styles.tableCell}>תאריך פרסום</Text>
            <Text style={styles.tableCell}>סטטוס</Text>
          </View>
          {data.section3.plansTable.map((plan, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tableCell}>{plan.planId}</Text>
              <Text style={styles.tableCell}>{plan.planName}</Text>
              <Text style={styles.tableCell}>{plan.publishDate}</Text>
              <Text style={styles.tableCell}>{plan.status}</Text>
            </View>
          ))}
        </View>
        {data.section3.plansTable.length < 4 && (
          <Text style={styles.requiredFieldMissing}>
            ⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח
          </Text>
        )}
      </View>
    )}

    {data.section3.rightsSummary && (
      <View style={{ marginBottom: 15 }}>
        <Text style={styles.h3}>3.2 ריכוז זכויות בנייה</Text>
        <View style={styles.bulletList}>
          {data.section3.rightsSummary.designation && (
            <Text style={styles.bulletItem}>• ייעוד: {data.section3.rightsSummary.designation}</Text>
          )}
          {data.section3.rightsSummary.minLotSizeSqm && (
            <Text style={styles.bulletItem}>• שטח מגרש מינימלי: {formatNumber(data.section3.rightsSummary.minLotSizeSqm)} מ"ר</Text>
          )}
          {data.section3.rightsSummary.buildPercentage && (
            <Text style={styles.bulletItem}>• אחוזי בנייה: {data.section3.rightsSummary.buildPercentage}%</Text>
          )}
          {data.section3.rightsSummary.maxFloors && (
            <Text style={styles.bulletItem}>• מספר קומות מותרות: {data.section3.rightsSummary.maxFloors}</Text>
          )}
          {data.section3.rightsSummary.maxUnits && (
            <Text style={styles.bulletItem}>• מספר יחידות דיור: {data.section3.rightsSummary.maxUnits}</Text>
          )}
          {data.section3.rightsSummary.buildingLines && (
            <Text style={styles.bulletItem}>• קווי בניין: {data.section3.rightsSummary.buildingLines}</Text>
          )}
        </View>
      </View>
    )}

    {data.section3.permits && data.section3.permits.length > 0 && (
      <View style={{ marginBottom: 15 }}>
        <Text style={styles.h3}>3.3 רישוי בנייה</Text>
        <Text style={styles.paragraph}>
          מעיון בקובצי ההיתר המילוליים אותרו המסמכים הבאים:
        </Text>
        {data.section3.permits.map((permit, idx) => (
          <Text key={idx} style={styles.paragraph}>
            • היתר בנייה מס' {permit.permitNumber} מיום {permit.permitDate} — {permit.description}
          </Text>
        ))}
        
        {data.section3.completionCertificate && (
          <Text style={styles.paragraph}>
            תעודת גמר מיום {data.section3.completionCertificate.date} מאשרת כי הבניין ברח' {data.section3.completionCertificate.address} הוקם בהתאם לתנאי ההיתר העדכני.
          </Text>
        )}

        {data.section3.apartmentPlan ? (
          <View>
            {data.section3.apartmentPlan.src ? (
              <>
                <Image src={data.section3.apartmentPlan.src} style={styles.image} />
                {data.section3.apartmentPlan.caption && (
                  <Text style={styles.imageCaption}>{data.section3.apartmentPlan.caption}</Text>
                )}
              </>
            ) : (
              <ImagePlaceholder caption="הדבק כאן צילום-מסך תשריט הדירה" />
            )}
          </View>
        ) : (
          <ImagePlaceholder caption="הדבק כאן צילום-מסך תשריט הדירה" />
        )}
      </View>
    )}

    <Text style={styles.h3}>3.4 זיהום קרקע</Text>
    <Text style={styles.paragraph}>{data.section3.environmentQualityText}</Text>
  </Page>
);

// Section 4 - Factors and Considerations
const Section4: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.h2}>4. גורמים ושיקולים באומדן השווי</Text>
    <Text style={styles.paragraph}>{SECTION4_INTRO_TEXT}</Text>
    
    <Text style={styles.h3}>הסביבה והנכס</Text>
    <View style={styles.bulletList}>
      {data.section4.bullets.environmentAndAsset.map((bullet, idx) => (
        <Text key={idx} style={styles.bulletItem}>• {bullet}</Text>
      ))}
    </View>

    <Text style={styles.h3}>מצב הזכויות</Text>
    <View style={styles.bulletList}>
      {data.section4.bullets.rightsStatus.map((bullet, idx) => (
        <Text key={idx} style={styles.bulletItem}>• {bullet}</Text>
      ))}
    </View>

    <Text style={styles.h3}>מצב תכנוני ורישוי</Text>
    <View style={styles.bulletList}>
      {data.section4.bullets.planningAndPermits.map((bullet, idx) => (
        <Text key={idx} style={styles.bulletItem}>• {bullet}</Text>
      ))}
    </View>

    <Text style={styles.h3}>אומדן השווי</Text>
    <View style={styles.bulletList}>
      {data.section4.bullets.valuation.map((bullet, idx) => (
        <Text key={idx} style={styles.bulletItem}>• {bullet}</Text>
      ))}
    </View>
  </Page>
);

// Section 5 - Calculations
const Section5: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.h2}>5. תחשיבים לאומדן השווי</Text>
    
    <Text style={styles.h3}>5.1 נתוני השוואה</Text>
    {data.section5.comparablesTable && data.section5.comparablesTable.length > 0 && (
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCell}>יום מכירה</Text>
          <Text style={styles.tableCell}>כתובת</Text>
          <Text style={styles.tableCell}>גוש/חלקה</Text>
          <Text style={styles.tableCell}>חדרים</Text>
          <Text style={styles.tableCell}>קומה</Text>
          <Text style={styles.tableCell}>שטח בנוי (מ"ר)</Text>
          <Text style={styles.tableCell}>מחיר (₪)</Text>
          <Text style={styles.tableCell}>מחיר למ"ר (₪)</Text>
        </View>
        {data.section5.comparablesTable.map((comp, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.tableCell}>{comp.saleDate}</Text>
            <Text style={styles.tableCell}>{comp.address}</Text>
            <Text style={styles.tableCell}>{comp.gushHelka}</Text>
            <Text style={styles.tableCell}>{comp.rooms}</Text>
            <Text style={styles.tableCell}>{comp.floor}</Text>
            <Text style={styles.tableCell}>{formatNumber(comp.areaSqm)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(comp.priceIls)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(comp.pricePerSqmIls)}</Text>
          </View>
        ))}
      </View>
    )}

    <Text style={styles.h3}>5.2 תחשיב שווי הנכס</Text>
    <Text style={styles.paragraph}>
      בשים לב לנתוני ההשוואה שלעיל, ותוך ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי אקוו' לנכס נשוא השומה מוערך כ-{formatCurrency(data.section5.valuationCalc.pricePerBuiltSqmIls)}.
    </Text>
    
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={styles.tableCell}>תיאור הנכס</Text>
        <Text style={styles.tableCell}>שטח דירה בנוי (מ"ר)</Text>
        <Text style={styles.tableCell}>שטח מרפסות בנוי (מ"ר)</Text>
        <Text style={styles.tableCell}>שטח אקוו' (מ"ר)</Text>
        <Text style={styles.tableCell}>שווי למ"ר אקוו' (₪)</Text>
        <Text style={styles.tableCell}>שווי הנכס במעוגל (₪)</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={styles.tableCell}>{data.section5.valuationCalc.description}</Text>
        <Text style={styles.tableCell}>{formatNumber(data.section5.valuationCalc.builtAreaSqm)}</Text>
        <Text style={styles.tableCell}>{formatNumber(data.section5.valuationCalc.balconyAreaSqm)}</Text>
        <Text style={styles.tableCell}>{formatNumber(data.section5.valuationCalc.equityAreaSqm)}</Text>
        <Text style={styles.tableCell}>{formatCurrency(data.section5.valuationCalc.pricePerBuiltSqmIls)}</Text>
        <Text style={styles.tableCell}>{formatCurrency(data.section5.valuationCalc.totalValueIls)}</Text>
      </View>
    </View>
  </Page>
);

// Section 6 - Final Valuation - Based on 6216.6.25.pdf structure
const Section6: React.FC<{ data: ReportData }> = ({ data }) => (
  <Page size="A4" style={styles.page}>
    {/* Company Header */}
    <View style={{ marginBottom: 20 }}>
      {data.cover.companyName && (
        <Text style={styles.companyName}>{data.cover.companyName}</Text>
      )}
      {data.cover.companyTagline && (
        <Text style={styles.companyTagline}>{data.cover.companyTagline}</Text>
      )}
    </View>

    <Text style={styles.h2}>6. השומה</Text>
    
    <Text style={styles.paragraph}>
      בשים לב למיקומו של הנכס,
    </Text>
    
    <Text style={styles.paragraph}>
      לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
    </Text>
    
    <Text style={styles.paragraph}>
      בהביאי בחשבון שווים של נכסים דומים רלוונטיים,
    </Text>
    
    <Text style={styles.paragraph}>
      סביר לאמוד את שווי הנכס בגבולות, {formatCurrency(data.section6.finalValueIls)} ({data.section6.finalValueText}).
    </Text>
    
    <Text style={styles.paragraph}>
      {data.section6.freeFromDebtsText || SECTION6_FREE_FROM_DEBTS_TEXT}
    </Text>

    <View style={{ marginTop: 30 }}>
      <Text style={styles.h3}>הצהרה:</Text>
      <Text style={styles.paragraph}>
        {data.section6.declarationText || SECTION6_DECLARATION_TEXT}
      </Text>
      
      <Text style={styles.paragraph}>
        {data.section6.standardsText || SECTION6_STANDARDS_TEXT}
      </Text>
    </View>

    {/* Company Footer */}
    <View style={{ position: 'absolute', bottom: 56.7, right: 56.7, left: 56.7 }}>
      {data.cover.companyServices && (
        <Text style={{ fontSize: 8, textAlign: 'center' }}>{data.cover.companyServices}</Text>
      )}
      {data.cover.companyContact && (
        <View style={{ fontSize: 8, textAlign: 'center', marginTop: 4 }}>
          {data.cover.companyContact.phone && (
            <Text>טלפון: {data.cover.companyContact.phone}</Text>
          )}
          {data.cover.companyContact.email && (
            <Text>• דוא"ל: {data.cover.companyContact.email}</Text>
          )}
          {data.cover.companyContact.address && (
            <Text>כתובת משודרג: {data.cover.companyContact.address}</Text>
          )}
          {data.cover.companyContact.website && (
            <Text>{data.cover.companyContact.website}</Text>
          )}
        </View>
      )}
    </View>
  </Page>
);

// Main Document Component
export const AppraisalDocument: React.FC<{ data: ReportData }> = ({ data }) => (
  <Document>
    <CoverPage data={data} />
    <ClientDetailsPage data={data} />
    <Section1 data={data} />
    <Section2 data={data} />
    <Section3 data={data} />
    <Section4 data={data} />
    <Section5 data={data} />
    <Section6 data={data} />
  </Document>
);

