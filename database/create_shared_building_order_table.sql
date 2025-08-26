-- Create table for צו בית משותף (Shared Building Order) extracts
CREATE TABLE IF NOT EXISTS shared_building_order (
    id SERIAL PRIMARY KEY,
    filename TEXT,
    raw_text TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Basic document info
    order_issue_date DATE,
    order_issue_date_confidence DECIMAL(3,2),
    order_issue_date_context TEXT,
    
    -- Building description
    building_description TEXT,
    building_description_confidence DECIMAL(3,2),
    building_description_context TEXT,
    
    building_floors INTEGER,
    building_floors_confidence DECIMAL(3,2),
    building_floors_context TEXT,
    
    building_sub_plots_count INTEGER,
    building_sub_plots_count_confidence DECIMAL(3,2),
    building_sub_plots_count_context TEXT,
    
    building_address TEXT,
    building_address_confidence DECIMAL(3,2),
    building_address_context TEXT,
    
    -- Total sub-plots across all buildings
    total_sub_plots INTEGER,
    total_sub_plots_confidence DECIMAL(3,2),
    total_sub_plots_context TEXT,
    
    -- Sub-plot details (JSONB array for multiple sub-plots)
    sub_plots JSONB, -- Array of sub-plot objects with all fields
    
    -- Overall extraction confidence
    overall_confidence DECIMAL(3,2),
    extraction_notes TEXT
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shared_building_order_filename ON shared_building_order(filename);
CREATE INDEX IF NOT EXISTS idx_shared_building_order_processed_at ON shared_building_order(processed_at);
CREATE INDEX IF NOT EXISTS idx_shared_building_order_order_date ON shared_building_order(order_issue_date);

-- Create view for sub-plot details (flatten JSONB array)
CREATE OR REPLACE VIEW sub_plot_details AS
SELECT 
    sbo.id as order_id,
    sbo.filename,
    sbo.order_issue_date,
    sbo.building_address,
    (jsonb_array_elements(sbo.sub_plots)->>'sub_plot_number')::INTEGER as sub_plot_number,
    (jsonb_array_elements(sbo.sub_plots)->>'building_number')::INTEGER as building_number,
    (jsonb_array_elements(sbo.sub_plots)->>'area')::DECIMAL as area,
    jsonb_array_elements(sbo.sub_plots)->>'description' as description,
    (jsonb_array_elements(sbo.sub_plots)->>'floor')::INTEGER as floor,
    jsonb_array_elements(sbo.sub_plots)->>'shared_property_parts' as shared_property_parts,
    jsonb_array_elements(sbo.sub_plots)->'attachments' as attachments,
    jsonb_array_elements(sbo.sub_plots)->>'non_attachment_areas' as non_attachment_areas
FROM shared_building_order sbo
WHERE sbo.sub_plots IS NOT NULL;

COMMENT ON TABLE shared_building_order IS 'Extracts from צו בית משותף (Shared Building Order) documents';
COMMENT ON COLUMN shared_building_order.sub_plots IS 'JSONB array containing sub-plot details with structure: {sub_plot_number, building_number, area, description, floor, shared_property_parts, attachments: [{description, blueprint_marking, blueprint_color, area}], non_attachment_areas}';