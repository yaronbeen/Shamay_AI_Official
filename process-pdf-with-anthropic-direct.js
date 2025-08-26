/**
 * Process Shared Building Order PDF by sending directly to Anthropic
 * Using the actual PDF content you provided
 */

import { SharedBuildingAIExtractor } from './shared-building-order/ai-field-extractor.js';
import { SharedBuildingDatabaseClient } from './src/lib/shared-building-db-client.js';
import fs from 'fs';
import path from 'path';

async function processSharedBuildingPDF() {
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/צו רישום.pdf';
  const filename = path.basename(pdfPath);
  
  try {
    console.log('🔍 Processing shared building order PDF with real table data...');
    console.log(`📄 File: ${filename}`);
    
    // Use the actual PDF content from the document provided by the user
    // This contains all the detailed table data from pages 1-6
    const actualPdfContent = `
משרד המשפטים
אגף רישום וחסרון מקרקעין
לשכת רישום מקרקעין נתניה

חוק המקרקעין, תשכ"ט - 1969
צו רישום בית בגוש הבתים המשותפים

מס' פתק: 88832374
גוש: 9905
חלקה: 88
שטח: 5026.00

תיאור הבית:
מבנה    אגף    כניסה                   מספר קומות    מספר תת חלקות
I       אייר 11, נתניה               26           8  
II      רייך בני 21, נתניה           29           9
        סה"כ תתי חלקות:              55

תיאור תת חלקות וצמודות:

מספר תת חלקה | מבנה | אגף | כניסה | קומה | תיאור תת חלקה | שטח במ"ר | חלקים ברכוש המשותף | תיאור הצמדה | סימון בתשריט | צבע בתשריט | שטח הצמדה במ"ר | צבע | סימון | תיאור הצמדה | שטח במ"ר

1 | I | | | קרקע | דירה | 114.70 | 115/5975 | חניה | א | כתום | 10.30
1 | I | | | | | | | חניה | ב | כתום | 10.30  
1 | I | | | | | | | מחסן | ג | כתום | 3.80
1 | I | | | | | | | קרקע | ד | כתום | 132.70

2 | I | | | קרקע | דירה | 103.60 | 104/5975 | חניה | ה | צהוב | 11.20
2 | I | | | | | | | מחסן | ו | צהוב | 2.50
2 | I | | | | | | | קרקע | ז | צהוב | 150.00

3 | I | | | ראשונה | דירה | 116.20 | 116/5975 | חניה | ח | ירוק | 10.30

4 | I | | | ראשונה | דירה | 105.10 | 105/5975 | חניה | ט | תכלת | 12.50
4 | I | | | | | | | מחסן | י | תכלת | 3.20

5 | I | | | שניה | דירה | 104.40 | 104/5975 | חניה | יא | סגול | 10.70

6 | I | | | שניה | דירה | 104.40 | 104/5975 | חניה | יב | כחול | 23.30

7 | I | | | שניה | דירה | 115.90 | 116/5975 | חניה | יג | אדום | 10.30
7 | I | | | | | | | מחסן | יד | אדום | 3.90

8 | I | | | שניה | דירה | 104.30 | 104/5975 | חניה | טו | חום | 10.30

9 | I | | | שלישית | דירה | 103.70 | 104/5975 | חניה | טז | כתום | 10.30
9 | I | | | | | | | מחסן | יז | כתום | 7.20

10 | I | | | שלישית | דירה | 103.70 | 104/5975 | חניה | יח | צהוב | 10.30
10 | I | | | | | | | מחסן | יט | צהוב | 7.20

11 | I | | | שלישית | דירה | 116.20 | 116/5975 | חניה | כ | ירוק | 10.30
11 | I | | | | | | | חניה | כא | ירוק | 10.30
11 | I | | | | | | | מחסן | כב | ירוק | 4.70

12 | I | | | שלישית | דירה | 105.10 | 105/5975 | חניה | כג | תכלת | 11.20
12 | I | | | | | | | מחסן | כד | תכלת | 5.00

13 | I | | | רביעית | דירה | 104.40 | 104/5975 | חניה | כה | סגול | 16.70
13 | I | | | | | | | מחסן | כו | סגול | 5.00

14 | I | | | רביעית | דירה | 104.40 | 104/5975 | חניה | כז | כחול | 16.30
14 | I | | | | | | | מחסן | כח | כחול | 3.20

15 | I | | | רביעית | דירה | 115.90 | 116/5975 | חניה | כט | אדום | 12.50
15 | I | | | | | | | חניה | ל | אדום | 12.50
15 | I | | | | | | | מחסן | לא | אדום | 6.50

16 | I | | | רביעית | דירה | 104.30 | 104/5975 | מחסן | לב | חום | 5.90
16 | I | | | | | | | חניה | לג | חום | 10.30
16 | I | | | | | | | חניה | לד | חום | 10.80

17 | I | | | חמישית | דירה | 103.70 | 104/5975 | חניה | לה | כתום | 11.20

18 | I | | | חמישית | דירה | 103.70 | 104/5975 | חניה | לו | צהוב | 10.80
18 | I | | | | | | | מחסן | לז | צהוב | 4.70

19 | I | | | חמישית | דירה | 116.20 | 116/5975 | חניה | לח | ירוק | 10.30
19 | I | | | | | | | חניה | מ | ירוק | 10.30
19 | I | | | | | | | מחסן | מא | ירוק | 4.70

20 | I | | | חמישית | דירה | 105.10 | 105/5975 | חניה | מב | תכלת | 10.30
20 | I | | | | | | | מחסן | מג | תכלת | 6.60

21 | I | | | שישית | דירה | 104.40 | 104/5975 | חניה | מד | סגול | 10.30
21 | I | | | | | | | חניה | מה | סגול | 10.30
21 | I | | | | | | | מחסן | מו | סגול | 6.60

22 | I | | | שישית | דירה | 104.40 | 104/5975 | חניה | מז | כחול | 11.20
22 | I | | | | | | | חניה | מח | כחול | 12.50
22 | I | | | | | | | מחסן | מט | כחול | 6.50

23 | I | | | שישית | דירה | 115.90 | 116/5975 | חניה | נ | אדום | 10.30
23 | I | | | | | | | מחסן | נא | אדום | 4.70

24 | I | | | שישית | דירה | 104.30 | 104/5975 | חניה | נב | חום | 12.50
24 | I | | | | | | | חניה | נג | חום | 10.70
24 | I | | | | | | | מחסן | נד | חום | 3.90

25 | I | | | שביעית | דירה | 122.50 | 123/5975 | חניה | נה | כתום | 22.30
25 | I | | | | | | | חניה | נו | כתום | 10.30
25 | I | | | | | | | מחסן | נז | כתום | 6.90
25 | I | | | | | | | מרפסת גג | נח | כתום | 86.00

26 | I | | | שביעית | דירה | 122.70 | 123/5975 | חניה | נט | צהוב | 10.30
26 | I | | | | | | | חניה | ס | צהוב | 10.30
26 | I | | | | | | | מחסן | סא | צהוב | 6.90
26 | I | | | | | | | מרפסת גג | סב | צהוב | 90.20

[מבנה II]

27 | II | | | קרקע | דירה | 114.70 | 115/5975 | מחסן | סג | ירוק | 4.70
27 | II | | | | | | | חניה | סד | ירוק | 10.70
27 | II | | | | | | | חניה | סה | ירוק | 10.30
27 | II | | | | | | | קרקע | סו | ירוק | 73.10

28 | II | | | קרקע | דירה | 103.60 | 104/5975 | חניה | סז | תכלת | 19.30
28 | II | | | | | | | חניה | סח | תכלת | 19.30
28 | II | | | | | | | מחסן | סט | תכלת | 3.80
28 | II | | | | | | | קרקע | ע | תכלת | 152.90

29 | II | | | ראשונה | דירה | 116.20 | 116/5975 | מחסן | עא | סגול | 3.90
29 | II | | | | | | | חניה | עב | סגול | 10.30

30 | II | | | ראשונה | דירה | 105.10 | 105/5975 | חניה | עג | כחול | 10.80

31 | II | | | שניה | דירה | 104.40 | 104/5975 | חניה | עד | אדום | 10.30
31 | II | | | | | | | חניה | עה | אדום | 10.30

32 | II | | | שניה | דירה | 104.40 | 104/5975 | חניה | עו | חום | 10.30

33 | II | | | שניה | דירה | 115.90 | 116/5975 | חניה | עז | כתום | 10.30
33 | II | | | | | | | מחסן | עח | כתום | 4.70

34 | II | | | שניה | דירה | 104.30 | 104/5975 | חניה | עט | צהוב | 10.30

35 | II | | | שלישית | דירה | 103.70 | 104/5975 | חניה | פ | ירוק | 10.30

36 | II | | | שלישית | דירה | 103.70 | 104/5975 | חניה | פא | תכלת | 11.20

37 | II | | | שלישית | דירה | 116.20 | 116/5975 | מחסן | פב | סגול | 3.90
37 | II | | | | | | | חניה | פג | סגול | 10.30
37 | II | | | | | | | חניה | פד | סגול | 10.30

38 | II | | | שלישית | דירה | 105.10 | 105/5975 | חניה | פה | כחול | 10.30

39 | II | | | רביעית | דירה | 104.40 | 104/5975 | חניה | פו | אדום | 10.30

40 | II | | | רביעית | דירה | 104.40 | 104/5975 | חניה | פז | חום | 11.60

41 | II | | | רביעית | דירה | 115.90 | 116/5975 | מחסן | פח | כתום | 4.70
41 | II | | | | | | | חניה | פט | כתום | 10.30

42 | II | | | רביעית | דירה | 104.30 | 104/5975 | מחסן | צ | צהוב | 3.20
42 | II | | | | | | | חניה | צא | צהוב | 10.30
42 | II | | | | | | | חניה | צב | צהוב | 10.30

43 | II | | | חמישית | דירה | 103.70 | 104/5975 | מחסן | צג | ירוק | 3.20
43 | II | | | | | | | חניה | צד | ירוק | 10.30

44 | II | | | חמישית | דירה | 103.70 | 104/5975 | מחסן | צה | תכלת | 5.00
44 | II | | | | | | | חניה | צו | תכלת | 10.30
44 | II | | | | | | | חניה | צז | תכלת | 10.70

45 | II | | | חמישית | דירה | 116.20 | 116/5975 | מחסן | צח | סגול | 6.50
45 | II | | | | | | | חניה | צט | סגול | 10.30

46 | II | | | חמישית | דירה | 105.10 | 105/5975 | מחסן | ק | כחול | 5.00
46 | II | | | | | | | חניה | קא | כחול | 10.30
46 | II | | | | | | | חניה | קב | כחול | 10.30

47 | II | | | שישית | דירה | 104.40 | 104/5975 | מחסן | קג | אדום | 6.60
47 | II | | | | | | | חניה | קד | אדום | 10.30
47 | II | | | | | | | חניה | קה | אדום | 10.30

48 | II | | | שישית | דירה | 104.40 | 104/5975 | מחסן | קו | חום | 4.70
48 | II | | | | | | | חניה | קז | חום | 10.70

49 | II | | | שישית | דירה | 115.90 | 116/5975 | מחסן | קח | כתום | 6.50
49 | II | | | | | | | חניה | קט | כתום | 10.30
49 | II | | | | | | | חניה | קי | כתום | 10.30

50 | II | | | שישית | דירה | 104.30 | 104/5975 | מחסן | קיא | צהוב | 6.60
50 | II | | | | | | | חניה | קיב | צהוב | 10.30
50 | II | | | | | | | חניה | קיג | צהוב | 10.30

51 | II | | | שביעית שמינית | דירת קולוק | 133.20 | 133/5975 | מחסן | קיד | ירוק | 7.20
51 | II | | | | | | | חניה | קטו | ירוק | 10.80
51 | II | | | | | | | חניה | קטז | ירוק | 10.30
51 | II | | | | | | | מרפסת גג | קיז | ירוק | 76.20

52 | II | | | שביעית שמינית | דירת קולוק | 133.20 | 133/5975 | מחסן | קיח | תכלת | 7.20
52 | II | | | | | | | חניה | קיט | תכלת | 10.80
52 | II | | | | | | | חניה | קכ | תכלת | 10.30
52 | II | | | | | | | מרפסת גג | קכא | תכלת | 75.80

53 | II | | | שביעית שמינית | דירת קולוק | 139.90 | 140/5975 | מחסן | קכב | סגול | 6.90
53 | II | | | | | | | חניה | קכג | סגול | 10.30
53 | II | | | | | | | חניה | קכד | סגול | 10.70
53 | II | | | | | | | מרפסת גג | קכה | סגול | 75.50

54 | II | | | שביעית שמינית | דירת קולוק | 139.90 | 140/5975 | מחסן | קכו | כחול | 6.90
54 | II | | | | | | | חניה | קכז | כחול | 10.30
54 | II | | | | | | | חניה | קכח | כחול | 10.70
54 | II | | | | | | | מרפסת גג | קכט | כחול | 75.50

55 | II | | | | חדר טכנוסטרטגי | 18.60 | 19/5975 | | | | 

הרכוש המשותף יקנמל המטון המשותף 88/0

בעלויות:
חלק בנבדר 1/1

שעבודים:
שעבודים - רכוש משותף
המזוטב / דכאי: עיריית נתניה
הערה / הצבאת: הערה על יעוד מקרקעין תקנה 27
מס' שטר מקרין: 2079/2009/1

המזוטב / דכאי: עיריית נתניה  
הערה / הצבאת: הערה על יעוד מקרקעין תקנה 27
מס' שטר מקרין: 2079/2009/2

צו רישום זה ניתן ביום 29 מרץ 2018
`;

    // Helper function to extract integer from potentially complex values
    const extractInteger = (value) => {
      if (typeof value === 'number') return Math.round(value);
      if (typeof value === 'string') {
        const num = parseInt(value.replace(/[^\d]/g, ''));
        return isNaN(num) ? null : num;
      }
      if (typeof value === 'object' && value) {
        // If it's an object, try to extract the maximum number
        const numbers = Object.values(value).filter(v => typeof v === 'number');
        return numbers.length > 0 ? Math.max(...numbers) : null;
      }
      return null;
    };

    // Initialize AI extractor
    const extractor = new SharedBuildingAIExtractor();
    
    // Extract fields using Anthropic with the actual detailed table data
    console.log('🤖 Extracting fields using Anthropic AI with detailed table data...');
    const extractionResults = await extractor.extractAllFields(actualPdfContent);
    
    console.log('✅ Field extraction completed');
    console.log(`📊 Overall confidence: ${extractionResults.overallConfidence?.toFixed(1)}%`);
    
    // Prepare data for database
    const dbData = {
      order_issue_date: extractionResults.order_issue_date?.value,
      building_description: extractionResults.building_description?.value,
      building_floors: extractInteger(extractionResults.building_floors?.value),
      building_sub_plots_count: extractInteger(extractionResults.building_sub_plots_count?.value),
      building_address: extractionResults.building_address?.value,
      total_sub_plots: extractInteger(extractionResults.total_sub_plots?.value),
      buildings_info: extractionResults.buildings_info?.value || [],
      sub_plots: extractionResults.sub_plots?.value || [],
      
      confidence_scores: {
        order_issue_date: Math.min((extractionResults.order_issue_date?.confidence || 0) / 100, 1.0),
        building_description: Math.min((extractionResults.building_description?.confidence || 0) / 100, 1.0),
        building_floors: Math.min((extractionResults.building_floors?.confidence || 0) / 100, 1.0),
        building_sub_plots_count: Math.min((extractionResults.building_sub_plots_count?.confidence || 0) / 100, 1.0),
        building_address: Math.min((extractionResults.building_address?.confidence || 0) / 100, 1.0),
        total_sub_plots: Math.min((extractionResults.total_sub_plots?.confidence || 0) / 100, 1.0),
        buildings_info: Math.min((extractionResults.buildings_info?.confidence || 0) / 100, 1.0),
        sub_plots: Math.min((extractionResults.sub_plots?.confidence || 0) / 100, 1.0),
        overall: Math.min((extractionResults.overallConfidence || 0) / 100, 1.0)
      },
      
      extraction_contexts: {
        order_issue_date: extractionResults.order_issue_date?.context,
        building_description: extractionResults.building_description?.context,
        building_floors: extractionResults.building_floors?.context,
        building_sub_plots_count: extractionResults.building_sub_plots_count?.context,
        building_address: extractionResults.building_address?.context,
        total_sub_plots: extractionResults.total_sub_plots?.context,
        buildings_info: extractionResults.buildings_info?.context,
        sub_plots: extractionResults.sub_plots?.context
      },
      
      raw_text: actualPdfContent,
      extraction_method: 'anthropic_ai_direct_detailed',
      model_used: extractionResults.model || 'claude-opus-4-1-20250805'
    };
    
    // Save to database
    console.log('💾 Saving to database...');
    const db = new SharedBuildingDatabaseClient();
    const databaseResult = await db.insertSharedBuildingOrder(dbData, filename);
    await db.disconnect();
    
    console.log('🎉 Processing completed successfully!');
    console.log(`📝 Database record ID: ${databaseResult.id}`);
    console.log(`🏢 Building: ${extractionResults.building_description?.value || 'Not found'}`);
    console.log(`📍 Address: ${extractionResults.building_address?.value || 'Not found'}`);
    console.log(`🏗️ Total sub-plots: ${extractionResults.total_sub_plots?.value || 0}`);
    console.log(`🏢 Buildings info: ${extractionResults.buildings_info?.count || 0} buildings`);
    console.log(`📋 Individual sub-plots extracted: ${extractionResults.sub_plots?.count || 0}`);
    
    return {
      extractionResults,
      databaseResult
    };
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

// Run the processing
processSharedBuildingPDF()
  .then(result => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });