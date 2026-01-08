const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

class ApartmentInteriorAnalyzer {
    constructor(apiKey = process.env.GEMINI_API_KEY) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.ai = new GoogleGenAI({ apiKey });
        this.model = 'gemini-3-pro-preview';
    }

    /**
     * Analyze apartment interior from image file or base64 data
     * @param {string} imagePathOrBase64 - Path to the image file or base64 data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result with description and structured data
     */
    async analyzeApartmentInterior(imagePathOrBase64, options = {}) {
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
            console.error('Error analyzing apartment interior:', error);
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
        const hebrewPrompt = `אנא כתוב תיאור מקצועי ומפורט של פנים הדירה בתמונה זו, בסגנון של דוח שומה מקצועי להערכת שווי נכס.

התיאור צריך להיות כתוב בפסקאות רצופות (לא ברשימה ממוספרת) ולכלול את הפרטים הבאים בצורה טבעית וזורמת:

**סגנון הכתיבה**: השתמש בסגנון פורמלי ומקצועי, כמו בדוח שומה של שמאי מקרקעין. התיאור צריך להיות רציף וקריא, עם משפטים מלאים ומקצועיים.

**תוכן חובה לכלול**:

- זיהוי סוג החדר (סלון, חדר שינה, מטבח, חדר רחצה וכו')
- חלוקה פנימית ופריסת החלל
- ממדים משוערים וגובה תקרה
- סוג ומצב הרצפה (קרמיקה, פרקט, שיש וכו')
- סטנדרט הגימור והאיכות הכללית
- פרטי גימור: סוג דלתות, חלונות, תריסים, חיפוי קירות
- ריהוט וציוד קבוע (מטבח, ארונות, מזגנים)
- מצב התחזוקה והשימור
- אלמנטים מיוחדים או בולטים
- איכות התאורה והאוורור הטבעי
- פרטים נוספים הרלוונטיים להערכת ערך הנכס

**דוגמה לסגנון הכתיבה הרצוי**:
"החדר המצולם מהווה סלון מרווח בשטח משוער של כ-30 מ"ר, בעל חלוקה פנימית פתוחה עם יציאה למרפסת. הרצפה מצופה בקרמיקה איכותית, והתקרה בגובה סטנדרטי של כ-2.70 מ'. סטנדרט הגימור בחדר טוב מאוד, כולל חלונות זכוכית במסגרות אלומיניום, תריסים חשמליים, ומיזוג אוויר מרכזי. החדר נהנה מתאורה טבעית מצוינת..."

**חשוב מאוד**: בסוף התיאור הטקסטואלי, אנא הוסף גם נתונים מובנים בפורמט JSON בתוך בלוק code:

\`\`\`json
{
  "room_type": "living_room/bedroom/kitchen/bathroom/balcony",
  "area_estimate": מספר_משוער_במ"ר_או_null,
  "finish_level": "יוקרתי/טוב/בינוני/בסיסי" או null,
  "condition": "excellent/good/fair/poor" או null,
  "features": ["built_in_storage", "natural_light", "hardwood_floor", "tile_floor", "high_ceiling", "balcony", "air_conditioning"]
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
                roomType: null,
                condition: null,
                features: [],
                issues: [],
                valueImpact: null,
                area_estimate: null,
                finish_level: null
            };

            // Extract room type (Hebrew patterns)
            const roomTypePatterns = [
                { pattern: /סלון|חדר מגורים/, type: 'living_room' },
                { pattern: /חדר שינה|שינה/, type: 'bedroom' },
                { pattern: /מטבח/, type: 'kitchen' },
                { pattern: /חדר רחצה|שירותים/, type: 'bathroom' },
                { pattern: /מרפסת/, type: 'balcony' }
            ];

            roomTypePatterns.forEach(({ pattern, type }) => {
                if (pattern.test(analysis)) {
                    structuredData.roomType = type;
                }
            });

            // Extract condition (Hebrew patterns)
            const conditionPatterns = [
                { pattern: /מצב מצוין|איכות גבוהה|מצוין/, condition: 'excellent' },
                { pattern: /מצב טוב|איכות טובה|טוב מאוד/, condition: 'good' },
                { pattern: /מצב בינוני|בינוני/, condition: 'fair' },
                { pattern: /דורש שיפוץ|מצב ירוד|ירוד/, condition: 'poor' }
            ];

            conditionPatterns.forEach(({ pattern, condition }) => {
                if (pattern.test(analysis)) {
                    structuredData.condition = condition;
                }
            });

            // Extract finish level (Hebrew patterns)
            const finishPatterns = [
                { pattern: /גימור יוקרתי|יוקרתי|מצוין/, level: 'יוקרתי' },
                { pattern: /גימור טוב|טוב מאוד|איכותי/, level: 'טוב' },
                { pattern: /גימור בינוני|סטנדרטי/, level: 'בינוני' },
                { pattern: /גימור בסיסי|בסיסי/, level: 'בסיסי' }
            ];

            finishPatterns.forEach(({ pattern, level }) => {
                if (pattern.test(analysis)) {
                    structuredData.finish_level = level;
                }
            });

            // Extract area estimate
            const areaMatch = analysis.match(/(\d+(?:\.\d+)?)\s*מ['"]ר|(\d+(?:\.\d+)?)\s*מטר/);
            if (areaMatch) {
                structuredData.area_estimate = parseFloat(areaMatch[1] || areaMatch[2]);
            }

            // Extract features (Hebrew patterns)
            const featurePatterns = [
                { pattern: /ארונות מובנים|אחסון מובנה/, feature: 'built_in_storage' },
                { pattern: /תאורה טבעית|אור טבעי/, feature: 'natural_light' },
                { pattern: /פרקט|רצפת עץ/, feature: 'hardwood_floor' },
                { pattern: /קרמיקה|רצפת קרמיקה/, feature: 'tile_floor' },
                { pattern: /שטיח|רצפת שטיח/, feature: 'carpet' },
                { pattern: /תקרה גבוהה|גובה תקרה/, feature: 'high_ceiling' },
                { pattern: /מרפסת/, feature: 'balcony' },
                { pattern: /מיזוג אוויר|מזגן/, feature: 'air_conditioning' }
            ];

            featurePatterns.forEach(({ pattern, feature }) => {
                if (pattern.test(analysis)) {
                    structuredData.features.push(feature);
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
     * Analyze multiple images in a folder
     */
    async analyzeBatch(folderPath, options = {}) {
        const results = [];
        
        try {
            const files = fs.readdirSync(folderPath);
            const imageFiles = files.filter(file => 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
            );

            console.log(`Found ${imageFiles.length} images to analyze`);

            for (const file of imageFiles) {
                const imagePath = path.join(folderPath, file);
                console.log(`Analyzing: ${file}`);
                
                const result = await this.analyzeApartmentInterior(imagePath, options);
                results.push(result);

                // Add delay to respect API rate limits
                if (options.delay) {
                    await new Promise(resolve => setTimeout(resolve, options.delay));
                }
            }

            return results;
        } catch (error) {
            console.error('Batch analysis error:', error);
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
                results: Array.isArray(results) ? results : [results]
            };

            fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
            console.log(`Results saved to: ${outputPath}`);
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }
}

// Example usage
async function example() {
    const analyzer = new ApartmentInteriorAnalyzer();
    
    // Single image analysis
    const result = await analyzer.analyzeApartmentInterior('./sample-apartment.jpg', {
        includeHebrew: true,
        focusAreas: ['condition', 'natural light', 'storage']
    });
    
    console.log('Analysis Result:', result);

    // Save results
    await analyzer.saveResults(result, './output/apartment-analysis.json');
}

module.exports = ApartmentInteriorAnalyzer;

// Run example if called directly
if (require.main === module) {
    example().catch(console.error);
}
