-- Create environment_analyses table for storing location analysis data
-- This table stores comprehensive environment analysis data from Claude AI

CREATE TABLE IF NOT EXISTS environment_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Location Information
  street TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  
  -- Analysis Data (stored as JSONB for flexibility)
  location_overview JSONB,
  infrastructure_transportation JSONB,
  amenities_services JSONB,
  demographics_lifestyle JSONB,
  real_estate_market JSONB,
  advantages_disadvantages JSONB,
  safety_environment JSONB,
  confidence_scores JSONB,
  
  -- Analysis Metadata
  confidence_score DECIMAL(5,4) DEFAULT 0, -- Overall confidence 0-1
  processing_time INTEGER DEFAULT 0, -- Processing time in milliseconds
  tokens_used INTEGER DEFAULT 0, -- AI tokens consumed
  cost DECIMAL(10,8) DEFAULT 0, -- API cost in USD
  
  -- Technical Details
  analysis_method VARCHAR(100) DEFAULT 'anthropic_claude_environment',
  model_used VARCHAR(100) DEFAULT 'claude-opus-4-1-20250805',
  raw_response TEXT, -- Store raw AI response (truncated if needed)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_environment_analyses_location ON environment_analyses(city, neighborhood, street);
CREATE INDEX IF NOT EXISTS idx_environment_analyses_city ON environment_analyses(city);
CREATE INDEX IF NOT EXISTS idx_environment_analyses_confidence ON environment_analyses(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_environment_analyses_created_at ON environment_analyses(created_at DESC);

-- Create a unique constraint to prevent duplicate analyses for the same location
CREATE UNIQUE INDEX IF NOT EXISTS idx_environment_analyses_unique_location 
ON environment_analyses(street, neighborhood, city);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_environment_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_environment_analyses_updated_at
  BEFORE UPDATE ON environment_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_environment_analyses_updated_at();

-- Create view for easy querying of analysis summaries
CREATE OR REPLACE VIEW environment_analysis_summary AS
SELECT 
  id,
  street,
  neighborhood,
  city,
  confidence_score,
  (location_overview->>'general_description') as description,
  (real_estate_market->>'investment_potential')::INTEGER as investment_score,
  (safety_environment->>'safety_level')::INTEGER as safety_score,
  (infrastructure_transportation->>'walkability_score')::INTEGER as walkability_score,
  created_at
FROM environment_analyses
ORDER BY created_at DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON environment_analyses TO postgres;
-- GRANT SELECT ON environment_analysis_summary TO postgres;

COMMENT ON TABLE environment_analyses IS 'Stores comprehensive environment analysis data for locations using Claude AI';
COMMENT ON COLUMN environment_analyses.location_overview IS 'General location characteristics and overview';
COMMENT ON COLUMN environment_analyses.infrastructure_transportation IS 'Transportation and infrastructure details';
COMMENT ON COLUMN environment_analyses.amenities_services IS 'Local amenities and services information';
COMMENT ON COLUMN environment_analyses.demographics_lifestyle IS 'Demographics and lifestyle characteristics';
COMMENT ON COLUMN environment_analyses.real_estate_market IS 'Real estate market analysis and trends';
COMMENT ON COLUMN environment_analyses.advantages_disadvantages IS 'Key advantages and disadvantages of the location';
COMMENT ON COLUMN environment_analyses.safety_environment IS 'Safety and environmental factors';
COMMENT ON COLUMN environment_analyses.confidence_scores IS 'Confidence scores for each analysis category';