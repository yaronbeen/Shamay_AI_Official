#!/usr/bin/env python3
"""
Create Excel workbook with all database tables as separate sheets
Each sheet contains sample data and proper Hebrew column headers
"""

import pandas as pd
import os
from datetime import datetime

# Define all tables with their data and Hebrew descriptions
tables_data = {
    "Land_Registry_Comprehensive": {
        "hebrew_name": "נסח טאבו מקיף",
        "description": "מסמכי בעלות ורישום מקרקעין",
        "data": [{
            "id": 1,
            "registration_office": "לשכת רישום מקרקעין תל אביב",
            "issue_date": "2024-01-15",
            "tabu_extract_date": "2024-01-10", 
            "document_filename": "sample_tabu.pdf",
            "gush": 9905,
            "chelka": 88,
            "sub_chelka": 8,
            "total_plot_area": 250.5,
            "regulation_type": "מוסכם",
            "address_from_tabu": "רחוב הרצל 123, תל אביב",
            "unit_description": "דירת 4 חדרים קומה 2",
            "floor": 2,
            "apartment_registered_area": 85.5,
            "balcony_area": 12.3,
            "owners_count": 1,
            "ownership_type": "בעלות מלאה",
            "confidence_overall": 0.85,
            "created_at": "2024-01-15 10:30:00"
        }]
    },
    
    "Building_Permits": {
        "hebrew_name": "היתרי בנייה",
        "description": "מסמכי היתרי בנייה מילוליים",
        "data": [{
            "id": 1,
            "document_filename": "building_permit_sample.pdf",
            "permit_number": "BP-2024-001",
            "permit_date": "2024-01-10",
            "permitted_usage": "מגורים",
            "permit_issue_date": "2024-01-08",
            "local_committee_name": "ועדה מקומית תל אביב",
            "overall_confidence": 87.5,
            "created_at": "2024-01-15 10:00:00"
        }]
    },
    
    "Shared_Building_Orders": {
        "hebrew_name": "צווי בית משותף",
        "description": "מסמכי רישום בית משותף",
        "data": [{
            "id": 1,
            "filename": "shared_building_order_sample.pdf",
            "order_issue_date": "2024-01-12",
            "building_description": "בניין מגורים בן 4 קומות",
            "building_floors": 4,
            "building_sub_plots_count": 8,
            "building_address": "רחוב בן יהודה 45 תל אביב",
            "total_sub_plots": 8,
            "overall_confidence": 0.88,
            "processed_at": "2024-01-15 11:00:00"
        }]
    },
    
    "Property_Assessments": {
        "hebrew_name": "שומות שווי נכסים",
        "description": "נתוני הערכת שווי נכסים מקצועית",
        "data": [{
            "id": 1,
            "assessment_type": "שומת שווי מלאה",
            "street_name": "רחוב הרצל",
            "house_number": "123",
            "neighborhood": "שכונת הלב",
            "city": "תל אביב",
            "client_name": "יוסי כהן",
            "visit_date": "2024-01-20",
            "visitor_name": "שמואל לוי",
            "presenter_name": "רחל גולן",
            "rooms": 4,
            "floor_number": "2",
            "eco_coefficient": 1.15,
            "status": "completed",
            "created_at": "2024-01-15 12:00:00"
        }]
    },
    
    "Images": {
        "hebrew_name": "תמונות נכסים",
        "description": "תמונות ומסמכים נלווים לנכסים",
        "data": [
            {
                "id": 1,
                "image_type": "תמונה חיצונית",
                "title": "חזית הבניין",
                "filename": "building_front.jpg",
                "file_size": 2048000,
                "width": 1920,
                "height": 1080,
                "property_assessment_id": 1,
                "captured_date": "2024-01-15",
                "uploaded_by": "צלם נכסים",
                "status": "active",
                "created_at": "2024-01-15 13:00:00"
            },
            {
                "id": 2,
                "image_type": "סקרין שוט GOVMAP",
                "title": "מפה קדסטרלית",
                "filename": "govmap_screenshot.png",
                "file_size": 1024000,
                "width": 1600,
                "height": 900,
                "property_assessment_id": 1,
                "captured_date": "2024-01-15",
                "uploaded_by": "מעריך נכסים",
                "status": "active",
                "created_at": "2024-01-15 13:15:00"
            }
        ]
    },
    
    "Garmushka": {
        "hebrew_name": "גרמושקה",
        "description": "מסמכי מדידה וחישוב שטחים",
        "data": [{
            "id": 1,
            "document_filename": "garmushka_sample.pdf",
            "garmushka_issue_date": "2024-01-10",
            "built_area": 120.50,
            "apartment_area": 95.30,
            "balcony_area": 15.20,
            "property_assessment_id": 1,
            "building_permit_id": 1,
            "processing_method": "manual",
            "overall_confidence": 0.88,
            "created_by": "מודד מוסמך",
            "status": "completed",
            "created_at": "2024-01-15 14:00:00"
        }]
    },
    
    "Comparable_Data": {
        "hebrew_name": "נתוני השוואה",
        "description": "נתוני מכירות נכסים להשוואה",
        "data": [
            {
                "id": 1,
                "sale_date": "2024-01-15",
                "address": "רחוב הרצל 125, תל אביב",
                "gush_chelka_sub": "9905/88/10",
                "rooms": 3.5,
                "floor_number": "2",
                "apartment_area_sqm": 85.5,
                "parking_spaces": 1,
                "construction_year": 2010,
                "declared_price": 2850000,
                "price_per_sqm_rounded": 33333,
                "city": "תל אביב",
                "data_quality_score": 85,
                "is_valid": True,
                "imported_by": "מנהל נתונים",
                "status": "active",
                "created_at": "2024-01-15 15:00:00"
            },
            {
                "id": 2,
                "sale_date": "2024-01-10",
                "address": "רחוב בן יהודה 50, תל אביב",
                "gush_chelka_sub": "9905/89/5",
                "rooms": 4,
                "floor_number": "3",
                "apartment_area_sqm": 92.0,
                "parking_spaces": 1,
                "construction_year": 2015,
                "declared_price": 3200000,
                "price_per_sqm_rounded": 34782,
                "city": "תל אביב",
                "data_quality_score": 90,
                "is_valid": True,
                "imported_by": "מנהל נתונים",
                "status": "active",
                "created_at": "2024-01-15 15:01:00"
            }
        ]
    },
    
    "Miscellaneous": {
        "hebrew_name": "נתונים נוספים",
        "description": "נתוני הערכת שווי נוספים",
        "data": [{
            "id": 1,
            "today_date": "2024-01-15",
            "appraisal_id": "AP-2024-001",
            "opinion_types": "שומה מלאה, הערכת שווי",
            "land_form": "מלבנית",
            "land_surface": "שטוח",
            "value_per_sqm": 50000.00,
            "ecological_area": 120.50,
            "property_value": 6025000.00,
            "property_value_in_words": "שישה מיליון עשרים וחמישה אלף שקלים",
            "environment_description_prompt": "אזור מגורים שקט ויוקרתי ליד פארק עירוני",
            "plot_description_prompt": "חלקה פינתית עם נגישות מעולה לתחבורה ציבורית",
            "internal_property_description": "דירת 4 חדרים מחולקת היטב עם מרפסת גדולה",
            "property_assessment_id": 1,
            "created_by": "מעריך נכסים",
            "status": "completed",
            "created_at": "2024-01-15 16:00:00"
        }]
    },
    
    "Environment_Analyses": {
        "hebrew_name": "ניתוחי סביבה",
        "description": "ניתוח מיקום וסביבה של נכסים",
        "data": [{
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "street": "רחוב הרצל",
            "neighborhood": "שכונת הלב", 
            "city": "תל אביב",
            "confidence_score": 0.85,
            "processing_time": 2500,
            "tokens_used": 1200,
            "cost": 0.0045,
            "analysis_method": "anthropic_claude_environment",
            "model_used": "claude-3-5-sonnet-20241022",
            "created_at": "2024-01-15 17:00:00"
        }]
    }
}

def create_excel_workbook():
    """Create Excel workbook with all database tables"""
    
    # Create Excel writer object
    output_file = "/mnt/c/Users/dell/CascadeProjects/Shamay-slow/database-templates/Shamay_Database_Tables.xlsx"
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Create summary sheet
        summary_data = []
        for table_name, table_info in tables_data.items():
            summary_data.append({
                "Table Name (English)": table_name,
                "שם הטבלה (עברית)": table_info["hebrew_name"],
                "תיאור": table_info["description"],
                "מספר רשומות לדוגמה": len(table_info["data"])
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary - סיכום', index=False)
        
        # Create individual sheets for each table
        for table_name, table_info in tables_data.items():
            df = pd.DataFrame(table_info["data"])
            
            # Limit sheet name length for Excel compatibility
            sheet_name = table_name[:31] if len(table_name) > 31 else table_name
            
            # Write data to sheet
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Get workbook and worksheet to add formatting
            workbook = writer.book
            worksheet = writer.sheets[sheet_name]
            
            # Add Hebrew title and description
            worksheet.insert_rows(1, 2)  # Insert 2 rows at the top
            worksheet['A1'] = f"טבלה: {table_info['hebrew_name']}"
            worksheet['A2'] = f"תיאור: {table_info['description']}"
            
            # Apply basic formatting without using create_font
            from openpyxl.styles import Font
            worksheet['A1'].font = Font(bold=True, size=14)
            worksheet['A2'].font = Font(italic=True)
            
    print(f"Excel file created successfully: {output_file}")

def create_csv_index():
    """Create index file listing all CSV files"""
    index_content = "# Shamay Database CSV Files\n\n"
    index_content += "This directory contains CSV templates for all database tables in the Shamay system.\n\n"
    index_content += "## Files:\n\n"
    
    csv_files = [
        ("1_land_registry_comprehensive.csv", "נסח טאבו מקיף", "Comprehensive land registry records"),
        ("2_building_permits.csv", "היתרי בנייה", "Building permits data"),
        ("3_shared_building_order.csv", "צווי בית משותף", "Shared building orders"),
        ("4_property_assessments.csv", "שומות שווי נכסים", "Property assessments"),
        ("5_images.csv", "תמונות נכסים", "Property images and documents"),
        ("6_garmushka.csv", "גרמושקה", "Measurement documents"),
        ("7_comparable_data.csv", "נתוני השוואה", "Comparable sales data"),
        ("8_miscellaneous.csv", "נתונים נוספים", "Miscellaneous valuation data"),
        ("9_environment_analyses.csv", "ניתוחי סביבה", "Environment analysis data")
    ]
    
    for filename, hebrew_name, english_desc in csv_files:
        index_content += f"- **{filename}** - {hebrew_name} ({english_desc})\n"
    
    index_content += "\n## Usage:\n\n"
    index_content += "1. Each CSV file contains sample data with proper column headers\n"
    index_content += "2. Use these templates to understand the database structure\n"  
    index_content += "3. Import data following the same format and column names\n"
    index_content += "4. Hebrew text is fully supported in all fields\n\n"
    index_content += "## Excel Version:\n\n"
    index_content += "A complete Excel workbook with all tables is available as `Shamay_Database_Tables.xlsx`\n"
    
    with open("/mnt/c/Users/dell/CascadeProjects/Shamay-slow/database-templates/README.md", "w", encoding="utf-8") as f:
        f.write(index_content)
    
    print("CSV index file created: README.md")

if __name__ == "__main__":
    try:
        create_excel_workbook()
        create_csv_index()
        print("All database templates created successfully!")
    except Exception as e:
        print(f"Error creating templates: {e}")
        print("Make sure pandas and openpyxl are installed: pip install pandas openpyxl")