import { processDocument, extractFieldsFromMarkdown, FieldParser } from './tabu.js';

// Integration functions
export async function processLandRegistryDocument(filePath) {
  return await processDocument(filePath, 'land_registry');
}

export async function processBuildingPermitDocument(filePath) {
  return await processDocument(filePath, 'building_permit');
}

export async function processSharedBuildingOrderDocument(filePath) {
  return await processDocument(filePath, 'shared_building_order');
}

export { processDocument, extractFieldsFromMarkdown, FieldParser };