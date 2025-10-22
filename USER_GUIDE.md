# SHAMAY.AI - User Guide

## 📖 Complete Guide to Property Valuation

Welcome to SHAMAY.AI, an AI-powered platform for professional property valuation in Israel. This guide will walk you through the entire valuation process.

---

## 🏠 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Creating a New Valuation](#creating-a-new-valuation)
4. [Step 1: Initial Property Data](#step-1-initial-property-data)
5. [Step 2: Document Upload & AI Processing](#step-2-document-upload--ai-processing)
6. [Step 3: Data Validation](#step-3-data-validation)
7. [Step 4: AI Analysis & Measurements](#step-4-ai-analysis--measurements)
8. [Step 5: Final Valuation & Export](#step-5-final-valuation--export)
9. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Getting Started

### Logging In

1. Open your browser and go to: http://localhost:3002
2. Click on **"התחברות"** (Sign In)
3. Enter your credentials:
   - **Email**: admin@shamay.ai
   - **Password**: admin123
   - _(Development mode: any email/password works)_
4. Click **"כניסה"** (Sign In)

### First Time Setup

After logging in for the first time:
1. Update your profile information
2. Set up your appraiser license details
3. Upload your signature (for valuation reports)

---

## 📊 Dashboard Overview

The dashboard displays:
- **Active Valuations**: Valuations currently in progress
- **Completed Valuations**: Finished valuation reports
- **Quick Actions**:
  - יצירת שומה חדשה (Create New Valuation)
  - שומות אחרונות (Recent Valuations)
  - הגדרות (Settings)

### Dashboard Actions

- **📝 New Valuation**: Start a new property valuation
- **📂 Open**: Continue working on an existing valuation
- **👁️ View**: View a completed valuation report
- **🗑️ Delete**: Remove a valuation (use with caution)
- **📥 Export**: Download valuation as PDF

### Navigation Shortcuts

- **Ctrl+D** (Windows) or **Cmd+D** (Mac): Return to dashboard from wizard
- **Ctrl+S** (Windows) or **Cmd+S** (Mac): Auto-save current progress

---

## 🆕 Creating a New Valuation

1. Click **"יצירת שומה חדשה"** (Create New Valuation)
2. You'll be taken to the 5-step valuation wizard
3. Your progress is automatically saved as you work

### Wizard Steps Overview

| Step | Name | Purpose |
|------|------|---------|
| 1️⃣ | נתוני נכס ראשוניים | Initial property information |
| 2️⃣ | העלאת מסמכים | Upload documents (Tabu, permits, images) |
| 3️⃣ | אימות נתונים | Validate AI-extracted data |
| 4️⃣ | ניתוח AI ומדידות | GIS analysis & measurements |
| 5️⃣ | שומה סופית | Final valuation & export |

---

## 1️⃣ Step 1: Initial Property Data

### Basic Property Information

Fill in the following fields:

#### Address Details
- **רחוב** (Street): e.g., הרצל
- **מספר בית** (Building Number): e.g., 25
- **עיר** (City): e.g., תל אביב-יפו
- **שכונה** (Neighborhood): e.g., פלורנטין (optional)

#### Property Characteristics
- **מספר חדרים** (Number of Rooms): e.g., 3.5, 4
- **קומה** (Floor): e.g., 3, קרקע (ground)
- **כיווני אוויר** (Air Directions): e.g., דרום-מערב
- **שטח** (Area in m²): Total apartment area

#### Property Type
- **מהות הנכס** (Property Essence): 
  - דירת מגורים (Residential apartment)
  - דירת גן (Garden apartment)
  - פנטהאוז (Penthouse)
  - דופלקס (Duplex)

#### Cover Page Information
- **שם מזמין השומה** (Client Name): Who ordered the valuation
- **תאריך ביקור בנכס** (Visit Date): When you visited the property
- **תאריך קובע לשומה** (Valuation Date): Effective date for valuation

#### Appraiser Information
- **שם השמאי** (Appraiser Name): Your full name
- **מספר רישיון** (License Number): Your appraiser license

### Navigation
- Click **"הבא"** (Next) to proceed to Step 2
- Click **"חזור"** (Back) to return to dashboard

---

## 2️⃣ Step 2: Document Upload & AI Processing

### Document Types

Upload the following documents for AI analysis:

#### 📄 Required Documents

**1. נסח טאבו (Land Registry / Tabu)**
- PDF file from Land Registry office
- Contains: Gush, Parcel, ownership details
- **What AI Extracts**:
  - משרד רישום מקרקעין (Registration Office)
  - גוש (Block number)
  - חלקה (Parcel number)
  - סוג בעלות (Ownership type)
  - הצמדות (Attachments: parking, storage)

**2. היתר בנייה (Building Permit)**
- PDF of building permit
- **What AI Extracts**:
  - מספר היתר (Permit number)
  - תאריך היתר (Permit date)
  - שטח בנוי (Built area)
  - שנת בניה (Construction year)
  - שימוש מותר (Permitted use)

**3. צו בית משותף (Shared Building Order)**
- PDF of condominium order
- **What AI Extracts**:
  - תיאור הבניין (Building description)
  - מספר קומות (Number of floors)
  - מספר יחידות (Number of units)
  - שטחים משותפים (Common areas)

#### 📷 Optional Images

**4. תמונות בניין (Building Images)**
- Exterior photos of the building
- **What AI Analyzes**:
  - סוג בניין (Building type)
  - מצב בניין (Building condition)
  - תכונות בניין (Building features)
  - הערכה כללית (Overall assessment)

**5. תמונות פנים (Interior Images)**
- Interior photos of the apartment
- **What AI Analyzes**:
  - תכנון הנכס (Property layout)
  - ניתוח חדרים (Room analysis)
  - מצב הנכס (Property condition)
  - רמת גימור (Finish level)

### How to Upload Documents

1. **Select Document Type** from the tabs:
   - תעודת בעלות (Land Registry)
   - היתר בנייה (Building Permit)
   - צו בית משותף (Shared Building)
   - תמונות (Images)

2. **Drag & Drop or Click** to upload:
   - Drag files to the upload area
   - Or click "בחר קבצים" (Choose Files)

3. **Wait for Upload**: Progress bar shows upload status

4. **View Uploaded Files**: Files appear below with:
   - ✅ Upload complete status
   - 📄 File name and type
   - 👁️ Preview option
   - 🗑️ Delete option

### AI Processing

After uploading all documents:

1. Click **"עיבוד מסמכים באמצעות AI"** (Process Documents with AI)
2. Wait for AI analysis (typically 30-60 seconds per document)
3. Processing indicators:
   - ⏱️ Processing time estimate
   - 💰 Cost estimate (~$0.50-2.00 per document)
   - ✅ Success/error messages

### Cost Information

AI processing costs:
- **Land Registry PDF**: ~$0.50-1.00
- **Building Permit PDF**: ~$0.50-1.00
- **Shared Building PDF**: ~$0.50-1.00
- **Images (per set)**: ~$0.25-0.50

**Total estimated cost per valuation**: $2.00-4.00

### Tips for Best Results

✅ **DO:**
- Use clear, high-resolution PDF scans
- Ensure text is readable (not too dark or light)
- Upload complete documents (all pages)
- Use good lighting for photos

❌ **DON'T:**
- Upload corrupted or password-protected PDFs
- Use extremely large files (>50MB)
- Upload photos with poor lighting or blur
- Skip required documents

---

## 3️⃣ Step 3: Data Validation

### Overview

Review and validate all data extracted by AI from your uploaded documents.

### Document Viewer

**Left Panel** shows:
- Uploaded documents in tabs
- PDF viewer for documents
- Image viewer for photos
- Navigation arrows (previous/next)

**Right Panel** shows:
- Extracted data fields
- Edit capabilities
- Data source indicators

### Validating Extracted Data

#### Legal Status (מצב משפטי)

Review and edit:
- **משרד רישום מקרקעין** (Registration Office)
  - e.g., תל אביב, ירושלים, חיפה
  - Source: From Tabu document (page 1)

- **מספר גוש** (Block Number)
  - e.g., 6123
  - Source: From Tabu document (page 1)

- **מספר חלקה** (Parcel Number)
  - e.g., 455
  - Source: From Tabu document (page 1)

- **סוג בעלות** (Ownership Type)
  - בעלות פרטית (Private ownership)
  - בעלות משותפת (Shared ownership)
  - חכירה (Lease)
  - שכירות (Rent)
  - Source: From Tabu document (page 2)

- **נספחים** (Attachments)
  - e.g., חניה (Parking), מחסן (Storage)
  - Source: From Tabu document (page 3)

#### Building Details (פרטי הבניין)

Review and edit:
- **שנת בניה** (Construction Year)
  - e.g., 2015
  - Source: From building permit

- **קומה** (Floor)
  - e.g., 3, קרקע (ground)
  - Source: From user input or Tabu

- **שטח בנוי (מ"ר)** (Built Area)
  - e.g., 85.5
  - Source: From building permit (page 2)

- **תיאור הבניין** (Building Description)
  - Source: From shared building order (section 1)

- **שימוש מותר** (Permitted Use)
  - e.g., מגורים (Residential)
  - Source: From planning information

#### Property Characteristics (מאפייני הנכס)

Review and edit:
- **מספר חדרים** (Number of Rooms)
  - Source: From user input

- **קומה** (Floor)
  - Source: From user input

- **מצב הנכס** (Property Condition)
  - מצוין (Excellent)
  - טוב (Good)
  - בינוני (Average)
  - גרוע (Poor)
  - דורש שיפוץ (Needs renovation)
  - Source: Determined from property images

- **רמת גימור** (Finish Level)
  - בסיסי (Basic)
  - בינוני (Standard)
  - גבוה (High)
  - יוקרתי (Luxury)
  - לוקסוס (Premium)
  - Source: Determined from property images

### How to Edit Fields

1. **Click the pencil icon** (✏️) next to any field
2. **Enter or select** the correct value
3. **Click the checkmark** (✓) to save
4. **Or click X** to cancel editing

### Data Source Indicators

Each field shows where the data came from:
- 📄 "נשלף מתוך תעודת בעלות" (Extracted from Tabu)
- 🏗️ "נשלף מתוך היתר בנייה" (Extracted from permit)
- 📸 "נקבע מתמונות הנכס" (Determined from images)
- 👤 "נשלף מנתוני המשתמש" (From user input)

---

## 4️⃣ Step 4: AI Analysis & Measurements

### A. GIS Location Analysis (ניתוח מיקום)

#### Running GIS Analysis

1. Click **"הרצת ניתוח GovMap"** (Run GovMap Analysis)
2. System automatically:
   - Geocodes your address
   - Converts to Israeli Grid coordinates
   - Generates GovMap URLs

#### Taking Screenshots

**Two map modes available:**
1. **מפה נקייה** (Clean Map) - Standard map view
2. **מפת תצ"א** (Land Registry Map) - With cadastral overlay

**For each map:**
1. Map loads in iframe
2. Click **"צילום מסך"** (Screenshot) button
3. Screenshot is captured and displayed
4. Click **"ערוך תמונה"** (Edit Image) to add annotations or crop
5. Screenshot is automatically saved to session

#### Editing Screenshots (Optional)

Tools available:
- **ציור** (Draw): Add freehand drawings
- **קו** (Line): Draw straight lines
- **מלבן** (Rectangle): Draw rectangles
- **עיגול** (Circle): Draw circles
- **חץ** (Arrow): Draw arrows
- **טקסט** (Text): Add text labels
- **צבע** (Color): Change drawing color
- **גזירה** (Crop): Crop the image

After editing:
1. Click **"שמור"** (Save) to apply changes
2. Or **"בטל"** (Cancel) to discard

### B. Garmushka Measurements (מדידות)

Measure rooms and areas from floor plan:

#### Step 1: Upload Floor Plan

1. Click **"העלה תוכנית"** (Upload Plan)
2. Select PDF or image file of floor plan
3. Plan appears on canvas

#### Step 2: Calibrate Measurements

**Critical step for accurate measurements!**

1. Click **"כיול"** (Calibration) button
2. Draw a line on a known distance in the plan
3. Enter the actual distance in meters
4. System calculates meters-per-pixel ratio

**Example:**
- Draw line along a wall marked as 4.5m
- Enter: 4.5
- Click save

⚠️ **Warning**: Without calibration, measurements will be inaccurate!

#### Step 3: Measure Areas

**Distance Measurement:**
1. Click **"מרחק"** (Distance)
2. Click points to draw a polyline
3. Double-click to finish
4. Measurement appears in table

**Area Measurement:**
1. Click **"שטח"** (Area)
2. Click points to draw a polygon
3. Close the polygon by clicking first point
4. Area calculation appears in table

#### Step 4: Name and Organize

1. **Rename measurements**:
   - Click on measurement name in table
   - Type new name (e.g., "סלון" for living room)
   - Press Enter

2. **Reorder measurements**:
   - Drag and drop rows in the table

3. **Delete measurements**:
   - Click 🗑️ (trash) icon

4. **Change colors**:
   - Each area gets a unique color automatically
   - Helps distinguish overlapping areas

#### Step 5: Export & Save

1. Click **"שמור"** (Save) when done
2. Measurements are saved to database
3. A PNG export is automatically generated
4. Both data and image are included in final report

### Measurement Table

The table shows:
- **שם** (Name): Measurement name
- **סוג** (Type): Calibration / Distance / Area
- **מדידה** (Measurement): Value in meters/square meters
- **הערות** (Notes): Additional notes
- **צבע** (Color): Visual indicator

---

## 5️⃣ Step 5: Final Valuation & Export

### Review All Data

**Summary panels show:**
- ✅ All extracted and validated data
- 📄 Document information
- 🏠 Property characteristics
- 📊 Measurements and analysis

### Calculate Valuation

1. **Review comparable sales** (if available)
2. **Enter final valuation amount**:
   - שווי סופי (Final Valuation): In NIS (₪)
   - מחיר למ"ר (Price per sqm): Calculated automatically

3. **Add professional notes** (optional):
   - Market analysis
   - Special considerations
   - Adjustment factors

### Preview Report

1. Click **"תצוגה מקדימה"** (Preview)
2. Professional report opens in new window
3. Review all sections:
   - Cover page with property image
   - Property description
   - Legal status
   - Analysis and conclusions
   - Calculations
   - Final valuation
   - Signature

### Export Options

**PDF Export:**
1. Click **"ייצוא PDF"** (Export PDF)
2. Report is generated with:
   - All data and images
   - Professional formatting
   - A4 page size (210mm x 297mm)
   - Ready for printing

**Save Draft:**
- Click **"שמירה"** (Save) to save progress
- Return anytime to complete valuation

**Mark Complete:**
- Click **"סיום"** (Complete) to mark valuation as done
- Valuation moves to "Completed" in dashboard

---

## 💡 Tips & Best Practices

### Document Preparation

✅ **Before uploading:**
- Scan documents at 300 DPI or higher
- Ensure pages are straight (not skewed)
- Check that all text is legible
- Remove any password protection
- Compress large files if needed (< 50MB)

### AI Processing

✅ **For best results:**
- Upload all available documents
- Use original documents (not photocopies if possible)
- Wait for processing to complete before moving forward
- Review extracted data carefully
- Correct any errors before proceeding

### Measurements

✅ **Garmushka tips:**
- Always calibrate before measuring
- Use clear, to-scale floor plans
- Double-check measurements against known dimensions
- Name areas clearly for the report
- Save frequently

### Photography

✅ **Property photos:**
- Take photos in good natural light
- Include wide shots and detail shots
- Capture all rooms and important features
- Show condition clearly (no filters)
- Minimum 5 interior + 3 exterior photos recommended

### Valuation Quality

✅ **Professional standards:**
- Complete all sections thoroughly
- Verify all extracted data manually
- Include supporting documentation
- Add professional notes and reasoning
- Review final report before export

### Time Management

⏱️ **Typical timeline:**
- Step 1 (Initial Data): 5-10 minutes
- Step 2 (Upload & AI): 10-15 minutes
- Step 3 (Validation): 10-15 minutes
- Step 4 (Analysis): 15-20 minutes
- Step 5 (Final): 5-10 minutes

**Total: 45-70 minutes per valuation**

### Cost Optimization

💰 **Reduce AI costs:**
- Only upload necessary documents
- Use high-quality scans (process once, not multiple times)
- Batch similar valuations together
- Review and correct data to avoid reprocessing

---

## 🔒 Data Security

Your valuation data is:
- ✅ Stored securely in PostgreSQL database
- ✅ Backed up automatically
- ✅ Accessible only with authentication
- ✅ Compliant with professional standards

### Auto-Save

- **Automatic saving** every few seconds
- **Manual save**: Ctrl+S (Cmd+S on Mac)
- **Session persistence**: Resume anytime
- **Database backup**: All data preserved

---

## 🆘 Common Issues & Solutions

### "Upload failed"
- Check file size (< 50MB)
- Ensure PDF is not password-protected
- Verify internet connection
- Try a different browser

### "AI processing failed"
- Check OpenAI API key is valid
- Verify sufficient API credits
- Ensure document is readable
- Contact support if persists

### "Screenshot not captured"
- Refresh the page
- Check browser permissions
- Ensure iframe loaded completely
- Try a different map mode

### "Measurements inaccurate"
- Recalibrate the floor plan
- Use a known dimension for calibration
- Check that plan is to scale
- Verify units (meters vs. other)

### "Data not saving"
- Check database connection
- Verify sufficient disk space
- Review browser console for errors
- Try manual save (Ctrl+S)

---

## 📞 Support & Contact

For technical support or questions:
- 📧 Email: support@shamay.ai
- 📱 Phone: [Your phone number]
- 💬 Chat: Available in dashboard
- 📚 Documentation: This guide + installation guide

---

## 📄 Document Structure Reference

The final PDF report includes:

1. **Cover Page**
   - Property photo
   - Address
   - Report date and reference number
   - Client information
   - Purpose and limitations

2. **Section 1: Property Description**
   - Neighborhood description
   - Parcel description with map
   - Property characteristics
   - Interior/exterior images

3. **Section 2: Legal Status**
   - Land registry information
   - Ownership details
   - Attachments and notes

4. **Section 3: Analysis**
   - Property analysis (AI-generated)
   - Market analysis
   - Room analysis
   - Risk assessment (if applicable)

5. **Section 4: Factors & Considerations**
   - Environment and location
   - Rights status
   - Planning and licensing
   - Valuation approach

6. **Section 5: Calculations**
   - Comparable sales data
   - Area calculations
   - Valuation formula

7. **Section 6: Final Valuation**
   - Summary in Hebrew and numbers
   - Includes VAT
   - Conditions and limitations

8. **Appraiser's Declaration**
   - Professional statement
   - Signature and license

---

## 📊 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+D** (Cmd+D) | Return to dashboard |
| **Ctrl+S** (Cmd+S) | Save current progress |
| **Ctrl+P** (Cmd+P) | Print/export PDF |
| **Tab** | Navigate fields |
| **Enter** | Submit/next |
| **Esc** | Cancel/close |

---

## ✅ Quality Checklist

Before completing a valuation, ensure:

- [ ] All required documents uploaded
- [ ] AI processing completed successfully
- [ ] All extracted data validated and corrected
- [ ] GIS screenshots captured for both map modes
- [ ] Garmushka measurements calibrated and completed
- [ ] Final valuation amount entered
- [ ] Report previewed and reviewed
- [ ] Professional signature added
- [ ] Client information correct
- [ ] All dates accurate

---

**Happy valuating!** 🏡✨

_SHAMAY.AI - Professional Property Valuation Made Easy_

