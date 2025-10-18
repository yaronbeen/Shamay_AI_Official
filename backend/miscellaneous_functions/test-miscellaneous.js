import { MiscellaneousFunctions, GetToday, appraisal_id, setLandForm, setLandSurface, getLandOptions } from './index.js';

async function testMiscellaneousFunctions() {
  console.log('🧪 Testing Miscellaneous Functions\n');

  try {
    const functions = new MiscellaneousFunctions();

    // Test 1: GetToday function
    console.log('📅 Test 1: GetToday Function');
    console.log('=' .repeat(50));
    
    const todayResult = await GetToday({
      created_by: 'test_user',
      notes: 'Test record created by GetToday function'
    });

    console.log('Today Date:', todayResult.today_date);
    console.log('Hebrew Date:', todayResult.formatted_date.hebrew);
    console.log('Database Record ID:', todayResult.database_record.id);
    console.log('Status:', todayResult.database_record.status);
    console.log('');

    // Test 2: appraisal_id function
    console.log('🆔 Test 2: appraisal_id Function');
    console.log('=' .repeat(50));

    const appraisalResult1 = await appraisal_id({
      additionalData: {
        created_by: 'test_user',
        opinion_types: 'שומה מלאה, הערכת שווי',
        notes: 'Test appraisal ID generation'
      }
    });

    console.log('Generated Appraisal ID:', appraisalResult1.appraisal_id);
    console.log('Index:', appraisalResult1.index);
    console.log('Month:', appraisalResult1.month);
    console.log('Year:', appraisalResult1.year);
    console.log('Database Record ID:', appraisalResult1.database_record.id);
    console.log('');

    // Test 3: Generate another appraisal_id for same month (should increment)
    console.log('🆔 Test 3: Second appraisal_id for same month');
    console.log('=' .repeat(50));

    const appraisalResult2 = await appraisal_id({
      additionalData: {
        created_by: 'test_user',
        opinion_types: 'שומת מקרקעין',
        notes: 'Second test appraisal ID'
      }
    });

    console.log('Second Appraisal ID:', appraisalResult2.appraisal_id);
    console.log('Index:', appraisalResult2.index);
    console.log('Should be incremented from previous:', appraisalResult1.index + 1);
    console.log('');

    // Test 4: Batch generation
    console.log('📦 Test 4: Batch Generation (3 IDs)');
    console.log('=' .repeat(50));

    const batchResults = await functions.batchGenerateAppraisalIds(3, {
      additionalData: {
        created_by: 'batch_test',
        opinion_types: 'batch generation test'
      }
    });

    batchResults.forEach((result, index) => {
      console.log(`Batch ID ${index + 1}: ${result.appraisal_id} (DB ID: ${result.database_record.id})`);
    });
    console.log('');

    // Test 5: Statistics
    console.log('📊 Test 5: Appraisal Statistics');
    console.log('=' .repeat(50));

    const stats = await functions.getAppraisalStatistics({
      limit: 100
    });

    console.log('Total Records:', stats.total_records);
    console.log('Records with Appraisal ID:', stats.with_appraisal_id);
    console.log('By Status:', stats.by_status);
    console.log('By Year:', stats.by_year);
    console.log('By Month:', stats.by_month);
    console.log('');

    // Test 6: Custom date appraisal_id
    console.log('📅 Test 6: Custom Date Appraisal ID');
    console.log('=' .repeat(50));

    const customDate = new Date('2024-12-15');
    const customResult = await appraisal_id({
      date: customDate,
      additionalData: {
        created_by: 'custom_date_test',
        notes: 'Testing custom date functionality'
      }
    });

    console.log('Custom Date:', customDate.toISOString().split('T')[0]);
    console.log('Generated ID:', customResult.appraisal_id);
    console.log('Expected Format: ###.12.2024');
    console.log('');

    // Test 7: Land Options Display
    console.log('🏞️ Test 7: Available Land Options');
    console.log('=' .repeat(50));

    const landOptions = getLandOptions();
    console.log('Available Land Form Options (צורת הקרקע):');
    landOptions.land_form.options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    console.log('');

    console.log('Available Land Surface Options (פני הקרקע):');
    landOptions.land_surface.options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    console.log('');

    // Test 8: Set Land Form
    console.log('🏗️ Test 8: Set Land Form (צורת הקרקע)');
    console.log('=' .repeat(50));

    // Use the record ID from Test 1 (todayResult)
    const recordIdForLandForm = todayResult.database_record.id;
    const selectedLandForm = 'מלבנית';

    const landFormResult = await setLandForm(recordIdForLandForm, selectedLandForm);
    console.log('Record ID:', landFormResult.record_id);
    console.log('Selected Land Form:', landFormResult.land_form);
    console.log('Hebrew Field Name:', landFormResult.field_name_hebrew);
    console.log('Updated At:', landFormResult.updated_at);
    console.log('');

    // Test 9: Set Land Surface
    console.log('🌄 Test 9: Set Land Surface (פני הקרקע)');
    console.log('=' .repeat(50));

    // Use the same record ID
    const selectedLandSurface = 'מישוריים';

    const landSurfaceResult = await setLandSurface(recordIdForLandForm, selectedLandSurface);
    console.log('Record ID:', landSurfaceResult.record_id);
    console.log('Selected Land Surface:', landSurfaceResult.land_surface);
    console.log('Hebrew Field Name:', landSurfaceResult.field_name_hebrew);
    console.log('Updated At:', landSurfaceResult.updated_at);
    console.log('');

    // Test 10: Invalid Selection Test
    console.log('❌ Test 10: Invalid Selection Handling');
    console.log('=' .repeat(50));

    try {
      await setLandForm(recordIdForLandForm, 'Invalid Option');
    } catch (error) {
      console.log('✅ Correctly caught invalid land form selection:', error.message);
    }

    try {
      await setLandSurface(recordIdForLandForm, 'Invalid Option');
    } catch (error) {
      console.log('✅ Correctly caught invalid land surface selection:', error.message);
    }
    console.log('');

    // Test 11: Set Land Form and Surface for Appraisal Record
    console.log('🏞️ Test 11: Set Land Properties for Appraisal Record');
    console.log('=' .repeat(50));

    const appraisalRecordId = appraisalResult1.database_record.id;
    
    const landFormResult2 = await setLandForm(appraisalRecordId, 'מרובעת');
    console.log('Appraisal Record Land Form:', landFormResult2.land_form);
    
    const landSurfaceResult2 = await setLandSurface(appraisalRecordId, 'תלולים');
    console.log('Appraisal Record Land Surface:', landSurfaceResult2.land_surface);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testMiscellaneousFunctions()
    .then(() => {
      console.log('\n🎉 Test execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error.message);
      process.exit(1);
    });
}