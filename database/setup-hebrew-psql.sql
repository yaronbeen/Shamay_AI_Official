-- PostgreSQL Hebrew Display Configuration
-- Run this to ensure Hebrew displays properly in psql

-- Check current encoding settings
SHOW client_encoding;
SHOW server_encoding;
SHOW lc_collate;
SHOW lc_ctype;

-- Set client encoding for Hebrew support (if needed)
-- SET client_encoding = 'UTF8';

-- Create a view for easy Hebrew data viewing
CREATE OR REPLACE VIEW hebrew_comparable_data AS
SELECT 
    id as "מזהה",
    sale_date as "תאריך_מכירה",
    address as "כתובת",
    gush_chelka_sub as "גוש_חלקה",
    rooms as "חדרים",
    apartment_area_sqm as "שטח_מר",
    declared_price as "מחיר_מוצהר",
    price_per_sqm_rounded as "מחיר_למר",
    data_quality_score as "איכות_נתונים"
FROM comparable_data
ORDER BY declared_price DESC;

-- Grant permissions
GRANT SELECT ON hebrew_comparable_data TO postgres;

-- Sample queries for Hebrew data
/*
Examples:

-- View all data with Hebrew column names:
SELECT * FROM hebrew_comparable_data;

-- Find expensive properties:
SELECT כתובת, מחיר_מוצהר FROM hebrew_comparable_data WHERE מחיר_מוצהר > 2600000;

-- Group by street:
SELECT 
    substring(כתובת from '^[^ ]+') as רחוב,
    count(*) as כמות_נכסים,
    avg(מחיר_מוצהר) as מחיר_ממוצע
FROM hebrew_comparable_data 
GROUP BY substring(כתובת from '^[^ ]+')
ORDER BY מחיר_ממוצע DESC;

-- Price per sqm analysis:
SELECT 
    כתובת,
    שטח_מר,
    מחיר_למר,
    CASE 
        WHEN מחיר_למר > 24000 THEN 'יקר'
        WHEN מחיר_למר > 22000 THEN 'בינוני'
        ELSE 'זול'
    END as קטגוריית_מחיר
FROM hebrew_comparable_data
ORDER BY מחיר_למר DESC;

*/

COMMENT ON VIEW hebrew_comparable_data IS 'תצוגה של נתוני השוואה עם כותרות בעברית - Hebrew view of comparable data';