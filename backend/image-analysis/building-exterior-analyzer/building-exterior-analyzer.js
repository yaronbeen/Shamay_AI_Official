const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

class BuildingExteriorAnalyzer {
    constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.anthropic = new Anthropic({ apiKey });
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

            // Send to Anthropic
            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mimeType,
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }]
            });

            const analysis = response.content[0].text;
            
            // Parse structured data if possible
            const structuredData = this.parseStructuredData(analysis);

            return {
                success: true,
                imagePath: imagePathOrBase64,
                analysis,
                structuredData,
                timestamp: new Date().toISOString(),
                tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
                cost: this.estimateCost(response.usage?.input_tokens || 0, response.usage?.output_tokens || 0)
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
        const hebrewPrompt = `אתה שמאי מקרקעין ישראלי בכיר. קלט: תמונת חזית חיצונית של מבנה (ייתכן שרק חלקית/מטושטשת). משימה: הפק פסקה אחת, עברית מקצועית וקצרה (90–130 מילים), בגוף שלישי, ללא כותרות/מספור/רשימות, וללא אזכורי תהליך ("בתמונה נראה", "הצילום"). הישאר ענייני ושמאיתי.

יש לשלב, בטבעיות בתוך הפסקה:
• סוג המבנה ושימושו, מספר קומות וגיל משוער (טווח שנים).
• סגנון אדריכלי, חומרי בנייה, צבעים ואלמנטים ייחודיים (קירות, חיפויים, מעקות, פתחים).
• מצב כללי מדורג: מצוין/טוב/בינוני/דורש שיפוץ; מצב חלונות/מסגרות, קירות/טיח/סדיקה, וגג (רעפים/בטון/אחר).
• מרפסות: הימצאות/מספר משוער, טיפוס (תלויות/שקועות/גג), תחושת גודל (קטנות/בינוניות/גדולות) ומצב.
• חניה ונגישות: פתרון חניה אופייני (רחוב/חניה משותפת/מקורה), גישה ופתח כניסה.
• סביבה: אופי הרחוב/שכונה, סמיכות למבנים דומים/מסחר, קירבה לשטח ירוק/נוף אם ניכר.
• אבטחה ותחזוקה: גדר/שער/אינטרקום/מצלמות אם מזוהים; רושם תחזוקה (ניקיון, צבע דהוי, חלודה).

כללי אמינות:
– אל תנחש. אם פרט לא ניתן לזיהוי או מוסתר, כתוב "לא מזוהה" או "מוסתר".
– אם איכות התמונה נמוכה או זווית מוגבלת, ציין "בהסתברות נמוכה" או "משוער".
– אל תתאר אנשים/לוחות רישוי/פרטים מזהים.

פלט: פסקה רציפה אחת בלבד, עברית תקנית, טרמינולוגיה שמאית, ללא אמוג'י, ללא גילוי דעת או הסתייגויות משפטיות.אתה שמאי מקרקעין ישראלי בכיר. קלט: תמונת חזית חיצונית של מבנה (ייתכן שרק חלקית/מטושטשת). משימה: הפק פסקה אחת, עברית מקצועית וקצרה (90–130 מילים), בגוף שלישי, ללא כותרות/מספור/רשימות, וללא אזכורי תהליך ("בתמונה נראה", "הצילום"). הישאר ענייני ושמאיתי.

יש לשלב, בטבעיות בתוך הפסקה:
• סוג המבנה ושימושו, מספר קומות וגיל משוער (טווח שנים).
• סגנון אדריכלי, חומרי בנייה, צבעים ואלמנטים ייחודיים (קירות, חיפויים, מעקות, פתחים).
• מצב כללי מדורג: מצוין/טוב/בינוני/דורש שיפוץ; מצב חלונות/מסגרות, קירות/טיח/סדיקה, וגג (רעפים/בטון/אחר).
• מרפסות: הימצאות/מספר משוער, טיפוס (תלויות/שקועות/גג), תחושת גודל (קטנות/בינוניות/גדולות) ומצב.
• חניה ונגישות: פתרון חניה אופייני (רחוב/חניה משותפת/מקורה), גישה ופתח כניסה.
• סביבה: אופי הרחוב/שכונה, סמיכות למבנים דומים/מסחר, קירבה לשטח ירוק/נוף אם ניכר.
• אבטחה ותחזוקה: גדר/שער/אינטרקום/מצלמות אם מזוהים; רושם תחזוקה (ניקיון, צבע דהוי, חלודה).

כללי אמינות:
– אל תנחש. אם פרט לא ניתן לזיהוי או מוסתר, כתוב "לא מזוהה" או "מוסתר".
– אם איכות התמונה נמוכה או זווית מוגבלת, ציין "בהסתברות נמוכה" או "משוער".
– אל תתאר אנשים/לוחות רישוי/פרטים מזהים.

פלט: פסקה רציפה אחת בלבד, עברית תקנית, טרמינולוגיה שמאית, ללא אמוג'י, ללא גילוי דעת או הסתייגויות משפטיות.`;

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
     * Estimate API cost based on token usage
     * @param {number} inputTokens - Input tokens used
     * @param {number} outputTokens - Output tokens used
     * @returns {number} - Estimated cost in USD
     */
    estimateCost(inputTokens, outputTokens) {
        // Claude Opus pricing: $15 per 1M input tokens, $75 per 1M output tokens
        return ((inputTokens * 15) + (outputTokens * 75)) / 1000000;
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
            averageTokensUsed: 0,
            totalCost: 0
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

            comparison.averageTokensUsed += result.tokens || 0;
            comparison.totalCost += result.cost || 0;
        });

        comparison.averageTokensUsed = Math.round(comparison.averageTokensUsed / successful.length);

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