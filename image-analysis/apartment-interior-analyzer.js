import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

class ApartmentInteriorAnalyzer {
    constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.anthropic = new Anthropic({ apiKey });
    }

    /**
     * Analyze apartment interior from image file
     * @param {string} imagePath - Path to the image file
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result with description and structured data
     */
    async analyzeApartmentInterior(imagePath, options = {}) {
        try {
            // Check if file exists
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            // Read and encode image
            const imageData = fs.readFileSync(imagePath);
            const base64Image = imageData.toString('base64');
            const mimeType = this.getMimeType(imagePath);

            // Prepare analysis prompt
            const prompt = this.buildAnalysisPrompt(options);

            // Send to Anthropic
            const response = await this.anthropic.messages.create({
                model: 'claude-opus-4-1-20250805',
                max_tokens: 4000,
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
                imagePath,
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
                imagePath,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Build analysis prompt based on options
     */
    buildAnalysisPrompt(options = {}) {
        const hebrewPrompt = `אנא נתח את תמונת הפנים של הדירה הזו בפירוט. אני צריך ניתוח מקיף למטרות הערכת נכס.

אנא ספק:

**1. זיהוי החדר**: איזה סוג חדר זה? (סלון, חדר שינה, מטבח, שירותים וכו')

**2. הערכת סגנון עיצוב**:
   - סגנון עיצוב כללי (מודרני, קלאסי, מינימליסטי, וכו')
   - צבעים דומיננטיים ופלטת הצבעים
   - רהיטים וסגנון הריהוט
   - אלמנטים דקורטיביים

**3. סוג רצפה ומצבה**:
   - חומר הרצפה (אריחים, פרקט, שיש, למינציה, וכו')
   - מצב הרצפה (מצוין, טוב, בינוני, דורש שיפוץ)
   - גודל ודפוס האריחים/הלוחות
   - איכות ההתקנה

**4. פריסה ומרחב**:
   - ממדי החדר המשוערים (אורך x רוחב)
   - גובה תקרה משוער
   - חלוקת המרחב והפונקציונליות
   - זרימה וקשר לחדרים אחרים

**5. אובייקטים ורהיטים**:
   - רשימת כל הרהיטים הנראים
   - מכשירי חשמל ואלקטרוניקה
   - אביזרים ופרטי עיצוב
   - צמחים או אלמנטים דקורטיביים

**6. מצב תחזוקה ואיכות**:
   - מצב כללי של החדר (מצוין, טוב, בינוני, דורש שיפוץ)
   - מצב הקירות והצבע
   - מצב התקרה
   - איכות הגימורים והעבודה

**7. תאורה ואוורור**:
   - מקורות אור טבעי (חלונות, דלתות זכוכית)
   - סוגי תאורה מלאכותית
   - איכות ועוצמת האור
   - אוורור וחדירת אוויר

**8. פרטים ארכיטקטוניים**:
   - אלמנטים מיוחדים בתקרה
   - עמודים או קשתות
   - נישות או בליטות
   - פרטים דקורטיביים

**9. אחסון ויעילות**:
   - פתרונות אחסון (ארונות, מדפים)
   - ניצול יעיל של המרחב
   - פונקציונליות החדר

**10. השפעה על ערך הנכס**:
   - תכונות המוסיפות ערך
   - בעיות העלולות להפחית ערך
   - התרשמות כללית עבור קונים/שוכרים פוטנציאליים

אנא ענה בעברית בלבד ובצורה מפורטת ומקצועית.`;

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

export default ApartmentInteriorAnalyzer;

// Run example if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
    example().catch(console.error);
}