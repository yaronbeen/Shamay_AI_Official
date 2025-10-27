const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

class ApartmentInteriorAnalyzer {
    constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.anthropic = new Anthropic({ apiKey });
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
                tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0
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
        const hebrewPrompt = `אתה שמאי מקרקעין ישראלי בכיר. קלט: תמונת פנים של חלל בדירה (ייתכן חלקית/מטושטשת). משימה: הפק פסקה אחת בעברית מקצועית וקצרה (90–130 מילים), בגוף שלישי, ללא כותרות/מספור/רשימות, וללא אזכורי תהליך/צילום.

שלב בפסקה, בטבעיות:
• זיהוי החלל ושימושו (סלון/מטבח/חדר שינה/רחצה/מסדרון) ומבנה החלל (פתוח/מופרד), ממדים משוערים וגובה תקרה (אם ניתן), תחושת מרחב וזרימה/נגישות.
• סגנון עיצוב כללי, פלטת צבעים, חומרים וגימורים (נגרות/דלתות/מסגרות).
• רצפה: חומר (פרקט/גרניט-פורצלן/בטון/אבן/אחר) ומצב מדורג: מצוין/טוב/בינוני/דורש שיפוץ.
• פתחים ותאורה: חלונות/תריסים/זיגוג, איכות ועוצמת אור טבעי; תאורה מלאכותית (סוג/פיזור/מספקת).
• רהיטים ומכשירים עיקריים, פתרונות אחסון ובנוי-בתוך.
• מצב תחזוקה: קירות/תקרה (סדיקה/קילוף/רטיבות), נקיון, איכות גמר.
• מערכות נוחות אם מזוהות: מיזוג, חימום, מאווררים, הצללה.

השפעה על הערך: ציין בתום הפסקה 2–3 גורמים מרכזיים המוסיפים/מפחיתים ערך (למשל איכות גמר, תאורה טבעית, אחסון, בלאי).

כללי אמינות:
– אל תנחש. כאשר פרט אינו ניתן לזיהוי כתוב “לא מזוהה” או “משוער/בהסתברות נמוכה”.
– אל תתאר אנשים/פנים/לוחות רישוי/פרטים מזהים. הימנע מאזכור מותגים אלא אם כתוב בבירור.
– פלט: פסקה רציפה אחת בלבד, עברית תקנית, טרמינולוגיה שמאית, ללא אמוג׳י וללא הצהרות משפטיות.`;

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
                valueImpact: null
            };

            // Extract room type
            const roomTypeMatch = analysis.match(/Room.*?:\s*([^\n]+)/i);
            if (roomTypeMatch) {
                structuredData.roomType = roomTypeMatch[1].trim();
            }

            // Extract condition
            const conditionMatch = analysis.match(/condition.*?:\s*(excellent|good|fair|poor)/i);
            if (conditionMatch) {
                structuredData.condition = conditionMatch[1].toLowerCase();
            }

            // Extract features (basic pattern matching)
            const featurePatterns = [
                /built-in storage/i,
                /natural light/i,
                /hardwood floor/i,
                /tile floor/i,
                /carpet/i,
                /high ceiling/i,
                /balcony/i,
                /air conditioning/i
            ];

            featurePatterns.forEach(pattern => {
                if (pattern.test(analysis)) {
                    structuredData.features.push(pattern.source.replace(/[/\\ig]/g, ''));
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