import { processLandRegistryDocument, processBuildingPermitDocument, processSharedBuildingOrderDocument } from './integrations/index.js';

// Main entry point for the SHAMAY.AI platform
console.log('🚀 SHAMAY.AI Platform Starting...');

// Export main functions
export {
  processLandRegistryDocument,
  processBuildingPermitDocument,
  processSharedBuildingOrderDocument
};

// If running directly, start the platform
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 SHAMAY.AI Platform Ready!');
  console.log('🌐 Frontend: cd frontend && npm run dev');
  console.log('🗄️ Database: npm run setup-db');
}
