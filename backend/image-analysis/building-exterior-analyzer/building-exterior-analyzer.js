const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

class BuildingExteriorAnalyzer {
    constructor(apiKey = process.env.GEMINI_API_KEY) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.ai = new GoogleGenAI({ apiKey });
        this.model = 'gemini-3-pro-preview';
    }

    /**
     * Analyze building exterior from image file or base64 data
     * @param {string} imagePathOrBase64 - Path to the image file or base64 data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result with description and structured data
     */
    async analyzeBuildingExterior(imagePathOrBase64, options = {}) {
        try {
            let base64Image, mimeType;

            // Check if input is base64 data or file path
            if (imagePathOrBase64.startsWith('data:image/')) {
                // Handle base64 data URL
                const [header, data] = imagePathOrBase64.split(',');
                base64Image = data;
                mimeType = header.match(/data:([^;]+)/)[1];
            } else if (imagePathOrBase64.startsWith('http://') || imagePathOrBase64.startsWith('https://')) {
                // Handle HTTP/HTTPS URLs
                const fetch = require('node-fetch');
                const response = await fetch(imagePathOrBase64);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
                }
                const buffer = await response.buffer();
                base64Image = buffer.toString('base64');
                mimeType = response.headers.get('content-type') || 'image/jpeg';
            } else if (imagePathOrBase64.startsWith('/9j/') || imagePathOrBase64.match(/^[A-Za-z0-9+/]+=*$/)) {
                // Handle raw base64 data
                base64Image = imagePathOrBase64;
                mimeType = 'image/jpeg'; // Default to JPEG for raw base64
            } else {
                // Handle file path
                if (!fs.existsSync(imagePathOrBase64)) {
                    throw new Error(`Image file not found: ${imagePathOrBase64}`);
                }
                const imageData = fs.readFileSync(imagePathOrBase64);
                base64Image = imageData.toString('base64');
                mimeType = this.getMimeType(imagePathOrBase64);
            }

            // Prepare analysis prompt
            const prompt = this.buildAnalysisPrompt(options);

            // Send to Gemini
            const contents = [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                },
                {
                    text: prompt
                }
            ];

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contents
            });

            // Extract text from response
            let analysis;
            if (response.text) {
                analysis = response.text;
            } else if (response.response && response.response.text) {
                analysis = response.response.text;
            } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                analysis = response.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Unexpected response format from Gemini API');
            }
            
            // Try to extract JSON from the response first (if AI provided structured data)
            let structuredData = null;
            const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    structuredData = JSON.parse(jsonMatch[1]);
                    // Remove JSON block from analysis text for cleaner description
                    analysis = analysis.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
                } catch (parseError) {
                    console.warn('Failed to parse JSON from response, falling back to text parsing:', parseError);
                }
            }
            
            // If no JSON found, fall back to text parsing
            if (!structuredData) {
                structuredData = this.parseStructuredData(analysis);
            }

            return {
                success: true,
                imagePath: imagePathOrBase64,
                analysis,
                structuredData,
                timestamp: new Date().toISOString(),
                model: this.model
            };

        } catch (error) {
            console.error('Error analyzing building exterior:', error);
            return {
                success: false,
                error: error.message,
                imagePath: imagePathOrBase64,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Build analysis prompt based on options
     */
    buildAnalysisPrompt(options = {}) {
        const hebrewPrompt = `אנא כתוב תיאור מקצועי ומפורט של חזית המבנה בתמונה זו, בסגנון של דוח שומה מקצועי להערכת שווי נכס.

התיאור צריך להיות כתוב בפסקאות רצופות (לא ברשימה ממוספרת) ולכלול את הפרטים הבאים בצורה טבעית וזורמת:

**סגנון הכתיבה**: השתמש בסגנון פורמלי ומקצועי, כמו בדוח שומה של שמאי מקרקעין. התיאור צריך להיות רציף וקריא, עם משפטים מלאים ומקצועיים.

**תוכן חובה לכלול**:

- זיהוי סוג המבנה (בניין דירות, וילה, בית פרטי, מבנה מסחרי וכו')
- מספר קומות משוער ומספר דירות/יחידות
- גיל המבנה המשוער והיתרי בנייה אם ניתן להעריך
- סגנון אדריכלי (מודרני, קלאסי, באוהאוס, ים תיכוני וכו')
- חומרי בנייה וגימור חיצוני (בטון, אבן, חיפוי וכו')
- מצב החיצוניות והתחזוקה הכללית
- פרטי גימור חיצוני: חלונות, דלתות, מרפסות, מעקים
- סוג ומספר מרפסות, כיווני אוויר משוערים
- פתרונות חניה (פרטית, תת-קרקעית, רחוב)
- נגישות למבנה ואיכות הכניסה
- מערכות נראות (מזגנים, אבטחה, אנטנות)
- סביבה ואופי השכונה
- מצב השכונה והמבנים הסמוכים
- גורמים סביבתיים (חשיפה לשמש, רעש, נוף)
- תכונות המשפיעות על ערך הנכס (חיוביות ושליליות)

**דוגמה לסגנון הכתיבה הרצוי**:
"המבנה המצולם מהווה בניין מגורים בן 6 קומות, הכולל כ-18 יחידות דיור. הבניין נבנה לפי היתר משנת 1994 בסגנון אדריכלי מודרני, עם חיפוי חיצוני בטון וחלונות זכוכית במסגרות אלומיניום. מצב החיצוניות טוב מאוד, עם סימני תחזוקה שוטפת. למבנה מרפסות מרווחות בכיווני אוויר צפון-דרום-מערב. פתרון החניה כולל חנייה תת-קרקעית עם גישה ישירה לבניין..."

**חשוב מאוד**: בסוף התיאור הטקסטואלי, אנא הוסף גם נתונים מובנים בפורמט JSON בתוך בלוק code:

\`\`\`json
{
  "building_type": "apartment_building/villa/commercial/mixed_use/townhouse",
  "floors": מספר_קומות_או_null,
  "age": שנת_בנייה_משוערת_או_null,
  "architectural_style": "modern/classical/bauhaus/mediterranean/minimalist" או null,
  "condition": "excellent/good/fair/poor" או null,
  "materials": ["בטון", "אבן", "חיפוי", etc.] או [],
  "features": ["underground_parking", "elevator", "security", etc.] או [],
  "parking_type": "private/street/underground/none" או null
}
\`\`\`

אנא ספק תיאור מפורט, מקצועי ורציף בעברית בלבד, ואז את הנתונים המובנים ב-JSON.`;

        // Add specific focus areas if requested
        if (options.focusAreas && options.focusAreas.length > 0) {
            return hebrewPrompt + `\n\nאנא שים לב מיוחד לנושאים הבאים: ${options.focusAreas.join(', ')}`;
        }

        return hebrewPrompt;
    }

    /**
     * Parse structured data from analysis text
     */
    parseStructuredData(analysis) {
        try {
            const structuredData = {
                buildingType: null,
                floors: null,
                age: null,
                architecturalStyle: null,
                condition: null,
                materials: [],
                features: [],
                issues: [],
                parkingType: null,
                valueFactors: {
                    positive: [],
                    negative: []
                }
            };

            // Hebrew building type patterns
            const buildingTypePatterns = [
                { pattern: /בניין דירות|בניין מגורים/, type: 'apartment_building' },
                { pattern: /וילה|בית פרטי/, type: 'villa' },
                { pattern: /מבנה מסחרי/, type: 'commercial' },
                { pattern: /מבנה מעורב/, type: 'mixed_use' },
                { pattern: /בית עירוני/, type: 'townhouse' }
            ];

            buildingTypePatterns.forEach(({ pattern, type }) => {
                if (pattern.test(analysis)) {
                    structuredData.buildingType = type;
                }
            });

            // Extract number of floors
            const floorsMatch = analysis.match(/(\d+)\s*קומות|(\d+)\s*מפלסים/);
            if (floorsMatch) {
                structuredData.floors = parseInt(floorsMatch[1] || floorsMatch[2]);
            }

            // Hebrew architectural style patterns
            const stylePatterns = [
                { pattern: /באוהאוס|בינלאומי/, style: 'bauhaus' },
                { pattern: /מודרני|עכשווי/, style: 'modern' },
                { pattern: /קלאסי|מסורתי/, style: 'classical' },
                { pattern: /ים תיכוני/, style: 'mediterranean' },
                { pattern: /מינימליסטי/, style: 'minimalist' }
            ];

            stylePatterns.forEach(({ pattern, style }) => {
                if (pattern.test(analysis)) {
                    structuredData.architecturalStyle = style;
                }
            });

            // Hebrew condition patterns
            const conditionPatterns = [
                { pattern: /מצב מצוין|איכות גבוהה/, condition: 'excellent' },
                { pattern: /מצב טוב|איכות טובה/, condition: 'good' },
                { pattern: /מצב בינוני/, condition: 'fair' },
                { pattern: /דורש שיפוץ|מצב ירוד/, condition: 'poor' }
            ];

            conditionPatterns.forEach(({ pattern, condition }) => {
                if (pattern.test(analysis)) {
                    structuredData.condition = condition;
                }
            });

            // Extract materials
            const materialPatterns = [
                /בטון/,
                /אבן/,
                /לבנים/,
                /חיפוי/,
                /מתכת/,
                /עץ/,
                /זכוכית/
            ];

            materialPatterns.forEach(pattern => {
                if (pattern.test(analysis)) {
                    const match = analysis.match(pattern);
                    if (match && !structuredData.materials.includes(match[0])) {
                        structuredData.materials.push(match[0]);
                    }
                }
            });

            // Extract parking type
            const parkingPatterns = [
                { pattern: /חניה פרטית/, type: 'private' },
                { pattern: /חניה ברחוב/, type: 'street' },
                { pattern: /חנייה תת.?קרקעית/, type: 'underground' },
                { pattern: /ללא חניה/, type: 'none' }
            ];

            parkingPatterns.forEach(({ pattern, type }) => {
                if (pattern.test(analysis)) {
                    structuredData.parkingType = type;
                }
            });

            return structuredData;
        } catch (error) {
            console.warn('Could not parse structured data:', error);
            return null;
        }
    }

    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * Analyze multiple building exterior images in a folder
     */
    async analyzeBatch(folderPath, options = {}) {
        const results = [];
        
        try {
            const files = fs.readdirSync(folderPath);
            const imageFiles = files.filter(file => 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
            );

            console.log(`Found ${imageFiles.length} building images to analyze`);

            for (const file of imageFiles) {
                const imagePath = path.join(folderPath, file);
                console.log(`Analyzing building: ${file}`);
                
                const result = await this.analyzeBuildingExterior(imagePath, options);
                results.push(result);

                // Add delay to respect API rate limits
                if (options.delay) {
                    await new Promise(resolve => setTimeout(resolve, options.delay));
                }
            }

            return results;
        } catch (error) {
            console.error('Batch building analysis error:', error);
            return results;
        }
    }

    /**
     * Save analysis results to file
     */
    async saveResults(results, outputPath) {
        try {
            const output = {
                timestamp: new Date().toISOString(),
                totalImages: Array.isArray(results) ? results.length : 1,
                analysisType: 'building_exterior',
                results: Array.isArray(results) ? results : [results]
            };

            fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
            console.log(`Building analysis results saved to: ${outputPath}`);
        } catch (error) {
            console.error('Error saving building analysis results:', error);
        }
    }

    /**
     * Compare multiple building exteriors
     */
    async compareBuildings(imagePaths, options = {}) {
        const results = [];
        
        console.log(`🏢 Comparing ${imagePaths.length} buildings...`);
        
        for (const imagePath of imagePaths) {
            const result = await this.analyzeBuildingExterior(imagePath, options);
            results.push(result);
            
            if (options.delay) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }
        }

        // Generate comparison summary
        const comparison = this.generateComparison(results);
        
        return {
            individualResults: results,
            comparison: comparison,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate comparison summary between multiple buildings
     */
    generateComparison(results) {
        const successful = results.filter(r => r.success);
        
        if (successful.length < 2) {
            return { message: 'Need at least 2 successful analyses for comparison' };
        }

        const comparison = {
            totalBuildings: successful.length,
            buildingTypes: {},
            conditions: {},
            architecturalStyles: {},
            averageTokensUsed: 0
        };

        successful.forEach(result => {
            if (result.structuredData) {
                // Count building types
                if (result.structuredData.buildingType) {
                    comparison.buildingTypes[result.structuredData.buildingType] = 
                        (comparison.buildingTypes[result.structuredData.buildingType] || 0) + 1;
                }

                // Count conditions
                if (result.structuredData.condition) {
                    comparison.conditions[result.structuredData.condition] = 
                        (comparison.conditions[result.structuredData.condition] || 0) + 1;
                }

                // Count architectural styles
                if (result.structuredData.architecturalStyle) {
                    comparison.architecturalStyles[result.structuredData.architecturalStyle] = 
                        (comparison.architecturalStyles[result.structuredData.architecturalStyle] || 0) + 1;
                }
            }
        });

        return comparison;
    }
}

// Example usage
async function example() {
    const analyzer = new BuildingExteriorAnalyzer();
    
    // Single building analysis
    const result = await analyzer.analyzeBuildingExterior('./sample-building.jpg', {
        focusAreas: ['מצב מבנה', 'סגנון אדריכלי', 'חניה', 'איכות שכונה']
    });
    
    console.log('Building Analysis Result:', result);

    // Save results
    await analyzer.saveResults(result, './output/building-exterior-analysis.json');
}

module.exports = BuildingExteriorAnalyzer;

// Run example if called directly
if (require.main === module) {
    example().catch(console.error);
}
