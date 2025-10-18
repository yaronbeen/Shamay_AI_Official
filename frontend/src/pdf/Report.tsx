/**
 * Shamay.AI Valuation Report - React-PDF Component
 * RTL A4 template with theme integration
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { PDF_THEME, getRTLStyle, getPlaceholderStyle, isPlaceholderNeeded, getPlaceholderText } from './theme'

// Register Hebrew fonts
Font.register({
  family: 'Assistant',
  src: '/fonts/Assistant-Regular.ttf'
})

Font.register({
  family: 'Assistant',
  src: '/fonts/Assistant-Bold.ttf',
  fontWeight: 'bold'
})

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: PDF_THEME.colors.background,
    padding: PDF_THEME.page.margin.top,
    fontFamily: PDF_THEME.fonts.primary,
    fontSize: PDF_THEME.fonts.sizes.body,
    ...getRTLStyle()
  },
  
  // Cover Page Styles
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40
  },
  
  coverTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    ...getRTLStyle()
  },
  
  coverSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    ...getRTLStyle()
  },
  
  coverAddress: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 20,
    ...getRTLStyle()
  },
  
  coverImage: {
    width: PDF_THEME.images.cover.width,
    height: PDF_THEME.images.cover.height,
    border: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`,
    marginBottom: 20
  },
  
  coverClientBlock: {
    position: 'absolute',
    top: PDF_THEME.page.margin.top,
    right: PDF_THEME.page.margin.right,
    fontSize: 11,
    ...getRTLStyle()
  },
  
  coverDateBlock: {
    position: 'absolute',
    top: PDF_THEME.page.margin.top,
    left: PDF_THEME.page.margin.left,
    fontSize: 11,
    ...getRTLStyle()
  },
  
  coverFooter: {
    position: 'absolute',
    bottom: PDF_THEME.page.margin.bottom,
    left: 0,
    right: 0,
    fontSize: 9,
    color: PDF_THEME.colors.secondary,
    textAlign: 'center',
    ...getRTLStyle()
  },
  
  // Opening Page Styles
  openingPage: {
    flex: 1,
    paddingTop: 15
  },
  
  logo: {
    width: 250,
    height: 60,
    alignSelf: 'center',
    marginBottom: 15
  },
  
  titleFrame: {
    border: `${PDF_THEME.borders.medium}pt solid ${PDF_THEME.colors.primary}`,
    padding: 6,
    width: 160 * 2.834, // 160mm to points
    alignSelf: 'center',
    marginBottom: 20
  },
  
  titleFrameText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    ...getRTLStyle()
  },
  
  titleFrameAddress: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    ...getRTLStyle()
  },
  
  metaTable: {
    width: '100%',
    border: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`,
    marginBottom: 20
  },
  
  metaRow: {
    flexDirection: 'row',
    borderBottom: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`
  },
  
  metaField: {
    width: PDF_THEME.table.columnWidths.field,
    padding: PDF_THEME.table.cellPadding,
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: PDF_THEME.table.headerBg,
    ...getRTLStyle()
  },
  
  metaValue: {
    width: PDF_THEME.table.columnWidths.value,
    padding: PDF_THEME.table.cellPadding,
    fontSize: 11,
    ...getRTLStyle()
  },
  
  // Section Styles
  section: {
    marginBottom: 20
  },
  
  sectionTitle: {
    fontSize: PDF_THEME.fonts.sizes.h1,
    fontWeight: 'bold',
    marginBottom: 10,
    ...getRTLStyle()
  },
  
  subsectionTitle: {
    fontSize: PDF_THEME.fonts.sizes.h2,
    fontWeight: 'bold',
    marginBottom: 8,
    ...getRTLStyle()
  },
  
  paragraph: {
    fontSize: PDF_THEME.fonts.sizes.body,
    lineHeight: PDF_THEME.lineHeights.normal,
    marginBottom: 6,
    textAlign: 'justify',
    ...getRTLStyle()
  },
  
  // Map Styles
  mapContainer: {
    alignItems: 'center',
    marginBottom: 10
  },
  
  mapImage: {
    width: PDF_THEME.images.map.width,
    height: PDF_THEME.images.map.height,
    border: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`,
    marginBottom: 4
  },
  
  mapCaption: {
    fontSize: PDF_THEME.fonts.sizes.caption,
    fontStyle: 'italic',
    textAlign: 'center',
    ...getRTLStyle()
  },
  
  // Parcel Images
  parcelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10
  },
  
  parcelImage: {
    width: PDF_THEME.images.parcel.width,
    height: PDF_THEME.images.parcel.height,
    border: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`,
    marginHorizontal: 2.5 * 2.834 // 5mm to points
  },
  
  // Table Styles
  table: {
    width: '100%',
    border: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`,
    marginBottom: 10
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottom: `${PDF_THEME.borders.thin}pt solid ${PDF_THEME.colors.border}`
  },
  
  tableHeader: {
    backgroundColor: PDF_THEME.table.headerBg,
    fontWeight: 'bold'
  },
  
  tableCell: {
    padding: PDF_THEME.table.cellPadding,
    fontSize: 11,
    ...getRTLStyle()
  },
  
  // List Styles
  bulletList: {
    marginBottom: 10
  },
  
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
    ...getRTLStyle()
  },
  
  bullet: {
    fontSize: 11,
    marginRight: 6,
    ...getRTLStyle()
  },
  
  bulletText: {
    fontSize: 11,
    flex: 1,
    ...getRTLStyle()
  },
  
  // Placeholder Styles
  placeholder: {
    color: PDF_THEME.colors.accent,
    backgroundColor: PDF_THEME.placeholders.block.backgroundColor,
    border: PDF_THEME.placeholders.block.border,
    padding: PDF_THEME.placeholders.block.padding,
    fontSize: 11,
    ...getRTLStyle()
  },
  
  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: PDF_THEME.page.margin.bottom,
    right: PDF_THEME.page.margin.right,
    fontSize: PDF_THEME.fonts.sizes.footer,
    color: PDF_THEME.colors.secondary,
    ...getRTLStyle()
  },
  
  // Signature Styles
  signatureContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  
  signatureImage: {
    width: PDF_THEME.images.stamp.width,
    height: PDF_THEME.images.stamp.height,
    marginBottom: 10
  },
  
  signatureText: {
    fontSize: 11,
    textAlign: 'center',
    ...getRTLStyle()
  }
})

// Helper function to render placeholder
const renderPlaceholder = (value: any, fieldName: string, required: boolean = false) => {
  if (isPlaceholderNeeded(value, required)) {
    return (
      <Text style={styles.placeholder}>
        {getPlaceholderText(fieldName, required)}
      </Text>
    )
  }
  return <Text>{value || ''}</Text>
}

// Main Report Component
interface ReportProps {
  data: any
}

export const ValuationReport: React.FC<ReportProps> = ({ data }) => {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>אומדן שווי זכויות במקרקעין</Text>
          <Text style={styles.coverSubtitle}>שומת מקרקעין מלאה</Text>
          <Text style={styles.coverSubtitle}>דירת מגורים</Text>
          <Text style={styles.coverAddress}>
            {renderPlaceholder(data.כתובת, 'כתובת', true)}
          </Text>
          
          {data.תמונת_בניין && (
            <Image style={styles.coverImage} src={data.תמונת_בניין} />
          )}
          
          <View style={styles.coverClientBlock}>
            <Text>לכבוד,</Text>
            <Text style={{ fontWeight: 'bold' }}>
              {renderPlaceholder(data.שם_מזמין, 'שם מזמין', true)}
            </Text>
            <Text>ג.נ.א,</Text>
          </View>
          
          <View style={styles.coverDateBlock}>
            <Text>תאריך: {renderPlaceholder(data.תאריך_כתיבת_השומה, 'תאריך כתיבת השומה')}</Text>
            <Text>סימוכין: {renderPlaceholder(data.מספר_שומה, 'מספר שומה')}</Text>
          </View>
        </View>
        
        <Text style={styles.coverFooter}>
          שמאות המקרקעין • התחדשות עירונית • דוחות אפס וליווי פיננסי • תיסוי מקרקעין
        </Text>
      </Page>

      {/* Opening Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.openingPage}>
          <Image style={styles.logo} src="/logo.png" />
          
          <View style={styles.coverDateBlock}>
            <Text>תאריך: {renderPlaceholder(data.תאריך_כתיבת_השומה, 'תאריך כתיבת השומה')}</Text>
            <Text>סימוכין: {renderPlaceholder(data.מספר_שומה, 'מספר שומה')}</Text>
          </View>
          
          <View style={styles.coverClientBlock}>
            <Text>לכבוד,</Text>
            <Text style={{ fontWeight: 'bold' }}>
              {renderPlaceholder(data.שם_מזמין, 'שם מזמין', true)}
            </Text>
            <Text>ג.נ.א,</Text>
          </View>
          
          <View style={styles.titleFrame}>
            <Text style={styles.titleFrameText}>חוות דעת בענין</Text>
            <Text style={styles.titleFrameText}>אומדן שווי זכויות במקרקעין</Text>
            <Text style={styles.titleFrameText}>
              {renderPlaceholder(data.מהות_הנכס, 'מהות הנכס', true)}
            </Text>
            <Text style={styles.titleFrameAddress}>
              {renderPlaceholder(data.כתובת, 'כתובת', true)}
            </Text>
          </View>
          
          <Text style={styles.paragraph}>
            שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק). {renderPlaceholder(data.מטרת_חוות_דעת, 'מטרת חוות דעת')}.
          </Text>
          
          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>מטרת השומה</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.מטרת_חוות_דעת, 'מטרת חוות דעת')}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>מועד הביקור בנכס</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.מועד_ביקור, 'מועד ביקור', true)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>תאריך קובע לשומה</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.תאריך_קובע, 'תאריך קובע', true)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>מהות הנכס</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.מהות_הנכס, 'מהות הנכס', true)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>גוש / חלקה / תת</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.גוש, 'גוש', true)} / {renderPlaceholder(data.חלקה, 'חלקה', true)} / {renderPlaceholder(data.תת, 'תת', true)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>הצמדות</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.תקציר_הצמדות, 'תקציר הצמדות')}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>שטח רשום</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.שטח_רשום, 'שטח רשום', true)} מ"ר
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>שטח בנוי</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.שטח_בנוי, 'שטח בנוי')} מ"ר
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>כיווני אוויר</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.כיווני_אוויר, 'כיווני אוויר')}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaField}>זכויות</Text>
              <Text style={styles.metaValue}>
                {renderPlaceholder(data.זכויות, 'זכויות')}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.footer}>עמוד 1 מתוך X</Text>
      </Page>

      {/* Section 1: Property and Environment Description */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. תיאור הנכס והסביבה</Text>
          
          <Text style={styles.subsectionTitle}>1.1 תיאור הסביבה</Text>
          <Text style={styles.paragraph}>
            {renderPlaceholder(data.תיאור_סביבה, 'תיאור סביבה', true)}
          </Text>
          
          {data.מפת_סביבה && (
            <View style={styles.mapContainer}>
              <Image style={styles.mapImage} src={data.מפת_סביבה} />
              <Text style={styles.mapCaption}>
                תשריט סביבת הנכס (GOVMAP, {new Date().getFullYear()})
              </Text>
            </View>
          )}
          
          <Text style={styles.subsectionTitle}>1.2 תיאור החלקה</Text>
          <Text style={styles.paragraph}>
            חלקה {renderPlaceholder(data.חלקה, 'חלקה', true)} בגוש {renderPlaceholder(data.גוש, 'גוש', true)}, 
            בשטח קרקע רשום של {renderPlaceholder(data.שטח_חלקה, 'שטח חלקה')} מ"ר, 
            צורת {renderPlaceholder(data.צורת_חלקה, 'צורת חלקה')}, 
            פני הקרקע {renderPlaceholder(data.פני_קרקע, 'פני קרקע')}. 
            על החלקה בניין מגורים בן {renderPlaceholder(data.מספר_קומות, 'מספר קומות')} קומות מעל קומת קרקע, 
            שנבנה ב-{renderPlaceholder(data.שנת_בניה, 'שנת בניה')}, 
            ומכיל {renderPlaceholder(data.מספר_יחידות, 'מספר יחידות')} יח"ד.
          </Text>
          
          {data.תצא_חלקה && (
            <View style={styles.parcelContainer}>
              <Image style={styles.parcelImage} src={data.תצא_חלקה} />
              <Image style={styles.parcelImage} src={data.תצא_חלקה} />
            </View>
          )}
          
          <Text style={styles.subsectionTitle}>1.3 תיאור היחידה הנשוא</Text>
          <Text style={styles.paragraph}>
            {renderPlaceholder(data.תיאור_יחידה, 'תיאור יחידה', true)}
          </Text>
        </View>
        
        <Text style={styles.footer}>עמוד 2 מתוך X</Text>
      </Page>

      {/* Additional sections would continue here... */}
      
      {/* Final Page with Signature */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. השומה</Text>
          <Text style={styles.paragraph}>
            בהתבסס על הניתוח המפורט לעיל, שווי הנכס נכון לתאריך הקובע הוא:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>
              {renderPlaceholder(data.שווי_מעוגל, 'שווי מעוגל', true)} ₪
            </Text>
            <Text> ({renderPlaceholder(data.שווי_מעוגל_מילים, 'שווי מעוגל מילים')})</Text>
          </Text>
          
          <View style={styles.signatureContainer}>
            {data.חותמת && (
              <Image style={styles.signatureImage} src={data.חותמת} />
            )}
            <Text style={styles.signatureText}>
              {renderPlaceholder(data.שם_שמאי, 'שם שמאי', true)}
            </Text>
            <Text style={styles.signatureText}>
              שמאי מקרקעין מוסמך
            </Text>
          </View>
        </View>
        
        <Text style={styles.footer}>עמוד X מתוך X</Text>
      </Page>
    </Document>
  )
}
