-- Update shared_building_order table to include detailed sub-plot information
-- Based on Hebrew shared building order document requirements

-- First, let's enhance the sub_plots JSONB structure to include detailed sub-plot information
-- The JSONB will now store an array of objects with the following structure:
-- {
--   "sub_plot_number": number,
--   "building_number": string,
--   "area": number,
--   "description": string,
--   "floor": string,
--   "shared_property_parts": string,
--   "attachments": [
--     {
--       "description": string,
--       "diagram_symbol": string,
--       "diagram_color": string,
--       "area": number
--     }
--   ],
--   "non_attachment_areas": [
--     {
--       "description": string,
--       "area": number
--     }
--   ]
-- }

-- Add comments to the existing sub_plots column to document the enhanced structure
COMMENT ON COLUMN shared_building_order.sub_plots IS 'JSONB array containing detailed sub-plot information: sub_plot_number, building_number, area, description, floor, shared_property_parts, attachments (with description, diagram_symbol, diagram_color, area), non_attachment_areas';

-- Add additional fields for enhanced building information when there are multiple buildings
ALTER TABLE shared_building_order 
ADD COLUMN IF NOT EXISTS buildings_info JSONB;

COMMENT ON COLUMN shared_building_order.buildings_info IS 'JSONB array containing detailed building information: building_number, address, floors, sub_plots_count for each building when there are multiple buildings';

-- Add constraints and indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_building_sub_plots_gin ON shared_building_order USING gin (sub_plots);
CREATE INDEX IF NOT EXISTS idx_shared_building_buildings_info_gin ON shared_building_order USING gin (buildings_info);

-- Add validation for sub_plots JSONB structure (optional, for data integrity)
-- This ensures each sub-plot has at minimum a sub_plot_number
ALTER TABLE shared_building_order 
ADD CONSTRAINT IF NOT EXISTS valid_sub_plots_structure 
CHECK (
  sub_plots IS NULL OR 
  (
    sub_plots::jsonb ? '0' AND 
    (sub_plots->0)::jsonb ? 'sub_plot_number'
  ) OR
  jsonb_array_length(sub_plots) = 0
);

-- Update extraction_notes to include version info
UPDATE shared_building_order 
SET extraction_notes = extraction_notes || ' - Enhanced schema v2.0 with detailed sub-plot extraction'
WHERE extraction_notes IS NOT NULL AND extraction_notes NOT LIKE '%Enhanced schema v2.0%';

-- Create a view for easy access to detailed sub-plot information
CREATE OR REPLACE VIEW shared_building_sub_plots_detailed AS
SELECT 
    sbo.id,
    sbo.filename,
    sbo.order_issue_date,
    sbo.building_description,
    sbo.total_sub_plots,
    sub_plot.value->>'sub_plot_number' AS sub_plot_number,
    sub_plot.value->>'building_number' AS building_number,
    CAST(sub_plot.value->>'area' AS NUMERIC) AS area,
    sub_plot.value->>'description' AS description,
    sub_plot.value->>'floor' AS floor,
    sub_plot.value->>'shared_property_parts' AS shared_property_parts,
    sub_plot.value->'attachments' AS attachments,
    sub_plot.value->'non_attachment_areas' AS non_attachment_areas
FROM shared_building_order sbo
CROSS JOIN LATERAL jsonb_array_elements(sbo.sub_plots) AS sub_plot(value)
WHERE jsonb_typeof(sbo.sub_plots) = 'array' 
  AND jsonb_array_length(sbo.sub_plots) > 0
  AND sub_plot.value ? 'sub_plot_number';

-- Create a view for building information when multiple buildings exist  
CREATE OR REPLACE VIEW shared_building_buildings_info AS
SELECT 
    sbo.id,
    sbo.filename,
    building_info.value->>'building_number' AS building_number,
    building_info.value->>'address' AS address,
    CAST(building_info.value->>'floors' AS INTEGER) AS floors,
    CAST(building_info.value->>'sub_plots_count' AS INTEGER) AS sub_plots_count
FROM shared_building_order sbo
CROSS JOIN LATERAL jsonb_array_elements(sbo.buildings_info) AS building_info(value)
WHERE sbo.buildings_info IS NOT NULL 
  AND jsonb_typeof(sbo.buildings_info) = 'array'
  AND jsonb_array_length(sbo.buildings_info) > 0;

COMMIT;