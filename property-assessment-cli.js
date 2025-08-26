#!/usr/bin/env node

/**
 * Property Assessment CLI Tool
 * Command-line interface for managing property assessment user input data
 */

import { 
  createPropertyAssessment,
  updatePropertyAssessment,
  getPropertyAssessment,
  searchPropertyAssessments,
  getRecentPropertyAssessments,
  deletePropertyAssessment,
  validatePropertyAssessmentData,
  getPropertyAssessmentStats
} from './property-assessment/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    showHelp();
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'create':
        await handleCreate();
        break;
      case 'get':
        await handleGet();
        break;
      case 'search':
        await handleSearch();
        break;
      case 'list':
        await handleList();
        break;
      case 'update':
        await handleUpdate();
        break;
      case 'delete':
        await handleDelete();
        break;
      case 'stats':
        await handleStats();
        break;
      case 'validate':
        await handleValidate();
        break;
      case 'demo':
        await handleDemo();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🏠 Property Assessment CLI Tool

Usage: node property-assessment-cli.js <command> [options]

Commands:
  create                Create new property assessment (interactive)
  get <id>             Get property assessment by ID
  search <query>       Search property assessments
  list [limit]         List recent property assessments
  update <id>          Update property assessment (interactive)
  delete <id>          Delete property assessment
  stats                Show system statistics
  validate             Validate sample data
  demo                 Create demo records

Examples:
  node property-assessment-cli.js demo
  node property-assessment-cli.js list 5
  node property-assessment-cli.js get 1
  node property-assessment-cli.js search "תל אביב"
  node property-assessment-cli.js stats
`);
}

async function handleCreate() {
  console.log('🏠 Creating new property assessment...\n');
  
  // Sample data for testing - in real app this would be from a form
  const sampleData = {
    assessment_type: 'שומת שווי מלאה',
    street_name: 'רחוב דיזנגוף',
    house_number: '99',
    neighborhood: 'לב העיר',
    city: 'תל אביב',
    client_name: 'משה כהן',
    visit_date: '15/11/2024',
    visitor_name: 'יוסי לוי',
    presenter_name: 'שרה ישראלי',
    rooms: 4,
    floor_number: '3',
    free_text_additions: 'דירה מחודשת עם מרפסת גדולה',
    air_directions: 'צפון-מערב',
    north_description: 'נוף פתוח לים',
    south_description: 'פונה לרחוב שקט',
    east_description: 'שכנים טובים',
    west_description: 'מרפסת גדולה',
    relevant_plans_table: 'תמ"א 38, תב"ע מקומית 123',
    user_sections_count: 15,
    eco_coefficient: 1.25,
    status: 'draft',
    notes: 'רשומה נוצרה ע"י CLI לבדיקה'
  };
  
  const result = await createPropertyAssessment(sampleData, 'cli-user');
  
  console.log('\n✅ Property assessment created successfully!');
  console.log(`📋 ID: ${result.id}`);
  console.log(`📅 Created at: ${result.created_at}`);
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
}

async function handleGet() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide record ID: node property-assessment-cli.js get <id>');
    return;
  }
  
  const record = await getPropertyAssessment(id);
  
  console.log('\n🏠 Property Assessment Record:');
  console.log('=' .repeat(50));
  console.log(`ID: ${record.id}`);
  console.log(`Type: ${record.assessment_type || 'Not specified'}`);
  console.log(`Client: ${record.client_name || 'Not specified'}`);
  console.log(`Address: ${[record.street_name, record.house_number, record.neighborhood, record.city].filter(Boolean).join(', ')}`);
  console.log(`Visit Date: ${record.visit_date || 'Not specified'}`);
  console.log(`Visitor: ${record.visitor_name || 'Not specified'}`);
  console.log(`Rooms: ${record.rooms || 'Not specified'}`);
  console.log(`Floor: ${record.floor_number || 'Not specified'}`);
  console.log(`Status: ${record.status}`);
  console.log(`Created: ${record.created_at}`);
  console.log(`Updated: ${record.updated_at}`);
  
  if (record.free_text_additions) {
    console.log(`\nAdditional Notes: ${record.free_text_additions}`);
  }
  
  if (record.eco_coefficient) {
    console.log(`Eco Coefficient: ${record.eco_coefficient}`);
  }
}

async function handleSearch() {
  const query = process.argv[3];
  
  if (!query) {
    console.log('❌ Please provide search query: node property-assessment-cli.js search "<query>"');
    return;
  }
  
  // Try to search in multiple fields
  const criteria = {};
  
  if (query.includes('תל אביב') || query.includes('tel aviv')) {
    criteria.city = query;
  } else if (query.includes('רחוב') || query.includes('street')) {
    criteria.street_name = query;
  } else {
    // Default to client name search
    criteria.client_name = query;
  }
  
  const results = await searchPropertyAssessments(criteria);
  
  console.log(`\n🔍 Search results for "${query}": ${results.length} found`);
  console.log('=' .repeat(60));
  
  if (results.length === 0) {
    console.log('No records found.');
  } else {
    results.forEach(record => {
      const date = record.created_at ? new Date(record.created_at).toISOString().split('T')[0] : 'N/A';
      console.log(`ID: ${record.id} | ${record.client_name} | ${record.full_address} | ${record.status} | ${date}`);
    });
  }
}

async function handleList() {
  const limit = parseInt(process.argv[3]) || 10;
  
  const records = await getRecentPropertyAssessments(limit);
  
  console.log(`\n📋 Recent Property Assessments (${records.length} records):`);
  console.log('=' .repeat(80));
  console.log('ID   | Client Name      | Address                    | Status    | Date');
  console.log('-' .repeat(80));
  
  records.forEach(record => {
    const id = record.id.toString().padEnd(4);
    const client = (record.client_name || 'N/A').substring(0, 15).padEnd(15);
    const address = (record.address || 'N/A').substring(0, 25).padEnd(25);
    const status = record.status.padEnd(9);
    const date = record.created_at ? new Date(record.created_at).toISOString().split('T')[0] : 'N/A';
    
    console.log(`${id} | ${client} | ${address} | ${status} | ${date}`);
  });
}

async function handleUpdate() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide record ID: node property-assessment-cli.js update <id>');
    return;
  }
  
  // Sample update data - in real app this would be from a form
  const updateData = {
    status: 'completed',
    notes: 'Updated via CLI - assessment completed',
    eco_coefficient: 1.35,
    free_text_additions: 'דירה מחודשת עם מרפסת גדולה - עודכן'
  };
  
  const result = await updatePropertyAssessment(id, updateData, 'cli-user');
  
  console.log(`✅ Property assessment ${id} updated successfully!`);
  console.log(`📅 Updated at: ${result.updated_at}`);
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
}

async function handleDelete() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide record ID: node property-assessment-cli.js delete <id>');
    return;
  }
  
  // Show record first
  try {
    const record = await getPropertyAssessment(id);
    console.log(`\n🗑️ About to delete: ${record.client_name} (${record.assessment_type})`);
  } catch (error) {
    console.log(`❌ Record ${id} not found`);
    return;
  }
  
  const success = await deletePropertyAssessment(id);
  
  if (success) {
    console.log(`✅ Property assessment ${id} deleted successfully!`);
  }
}

async function handleStats() {
  const stats = await getPropertyAssessmentStats();
  
  console.log('\n📊 Property Assessment Statistics:');
  console.log('=' .repeat(40));
  console.log(`Total Records: ${stats.total}`);
  console.log(`Records This Month: ${stats.recentMonth}`);
  
  console.log('\n📈 By Status:');
  stats.byStatus.forEach(item => {
    console.log(`  ${item.status}: ${item.count}`);
  });
  
  console.log('\n🏙️ Top Cities:');
  stats.topCities.forEach(item => {
    console.log(`  ${item.city}: ${item.count}`);
  });
}

async function handleValidate() {
  console.log('🔍 Testing data validation...\n');
  
  // Test valid data
  const validData = {
    client_name: 'רחל כהן',
    assessment_type: 'שומת שווי מקוצרת',
    city: 'חיפה',
    street_name: 'רחוב הרצל',
    house_number: '45',
    visit_date: '20/11/2024',
    rooms: 3
  };
  
  const validResult = validatePropertyAssessmentData(validData);
  console.log('✅ Valid data test:');
  console.log(`  Valid: ${validResult.isValid}`);
  console.log(`  Warnings: ${validResult.warnings.length}`);
  
  // Test invalid data
  const invalidData = {
    client_name: '', // Missing required field
    assessment_type: 'שומת שווי',
    city: 'תל אביב',
    visit_date: '32/15/2024', // Invalid date
    rooms: 'not a number', // Invalid number
    eco_coefficient: 15 // Out of range
  };
  
  const invalidResult = validatePropertyAssessmentData(invalidData);
  console.log('\n❌ Invalid data test:');
  console.log(`  Valid: ${invalidResult.isValid}`);
  console.log(`  Errors: ${invalidResult.errors.length}`);
  
  if (invalidResult.errors.length > 0) {
    console.log('  Error details:');
    invalidResult.errors.forEach(error => console.log(`    - ${error}`));
  }
}

async function handleDemo() {
  console.log('🎯 Creating demo property assessment records...\n');
  
  const demoRecords = [
    {
      assessment_type: 'שומת שווי מלאה',
      street_name: 'רחוב בן יהודה',
      house_number: '125',
      city: 'תל אביב',
      client_name: 'דוד ישראלי',
      visit_date: '10/11/2024',
      visitor_name: 'משה שמעון',
      rooms: 3,
      floor_number: '2',
      status: 'completed',
      eco_coefficient: 1.2
    },
    {
      assessment_type: 'שומת שווי מקוצרת',
      street_name: 'רחוב הנביאים',
      house_number: '67',
      city: 'ירושלים',
      client_name: 'שרה לוי',
      visit_date: '12/11/2024',
      visitor_name: 'יוסי כהן',
      rooms: 4,
      floor_number: '1',
      status: 'draft',
      eco_coefficient: 1.1
    },
    {
      assessment_type: 'שומת שווי עירונית',
      street_name: 'רחוב הרצל',
      house_number: '234',
      city: 'חיפה',
      client_name: 'אברהם גולדשטיין',
      visit_date: '08/11/2024',
      visitor_name: 'רחל ברק',
      rooms: 5,
      floor_number: '4',
      status: 'reviewed',
      eco_coefficient: 1.3
    }
  ];
  
  for (let i = 0; i < demoRecords.length; i++) {
    const record = demoRecords[i];
    try {
      const result = await createPropertyAssessment(record, 'demo-user');
      console.log(`✅ Demo record ${i + 1}: Created ID ${result.id} for ${record.client_name}`);
    } catch (error) {
      console.log(`❌ Demo record ${i + 1} failed: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Demo records creation completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}