#!/usr/bin/env python3
"""
PDF to Markdown converter using Microsoft's MarkItDown
Usage: python convert-pdf-markitdown.py <pdf_path> <output_path>
"""

import sys
import os
from pathlib import Path

def convert_pdf_to_markdown(pdf_path, output_path):
    """Convert PDF to Markdown using MarkItDown"""
    try:
        from markitdown import MarkItDown
        
        print(f"Converting PDF: {pdf_path}")
        print(f"Output: {output_path}")
        
        # Initialize MarkItDown
        md = MarkItDown()
        
        # Convert PDF to markdown
        result = md.convert(pdf_path)
        
        if not result or not result.text_content:
            print("ERROR: No content extracted from PDF")
            return False
            
        # Write markdown to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.text_content)
            
        print(f"SUCCESS: Conversion completed")
        print(f"Output length: {len(result.text_content)} characters")
        
        # Show first 500 characters as preview
        preview = result.text_content[:500]
        print("\nPreview:")
        print("-" * 50)
        print(preview)
        print("-" * 50)
        
        return True
        
    except ImportError as e:
        print(f"ERROR: MarkItDown not installed - {e}")
        print("Install with: pip install 'markitdown[all]'")
        return False
    except Exception as e:
        print(f"ERROR: Conversion failed - {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert-pdf-markitdown.py <pdf_path> <output_path>")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Validate input file
    if not os.path.exists(pdf_path):
        print(f"ERROR: PDF file not found: {pdf_path}")
        sys.exit(1)
        
    if not pdf_path.lower().endswith('.pdf'):
        print(f"ERROR: Input file must be a PDF: {pdf_path}")
        sys.exit(1)
        
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    # Convert PDF
    success = convert_pdf_to_markdown(pdf_path, output_path)
    
    if success:
        print(f"\n✅ PDF converted successfully to: {output_path}")
        sys.exit(0)
    else:
        print("\n❌ PDF conversion failed")
        sys.exit(1)

if __name__ == "__main__":
    main()