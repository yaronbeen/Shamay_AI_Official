/**
 * Field extractors for צו בית משותף (Shared Building Order) documents
 */

// Extract when the shared building order was issued
function extractOrderIssueDate(text) {
    const patterns = [
        /(?:הופק|נוצר|תאריך)\s*(?:ביום|ב)?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
        /(?:מיום|ביום)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
        /תאריך\s*(?:הפקה|יצירה)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const dateStr = matches[0][1];
            const context = matches[0][0];
            return {
                value: dateStr,
                confidence: 0.9,
                context: context.trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract building description/structure
function extractBuildingDescription(text) {
    const patterns = [
        /תיאור\s+(?:הבית|המבנה)\s*[:\-]?\s*(.+?)(?=\n|מספר קומות|תיאור|$)/g,
        /מבנה\s*[:\-]?\s*(.+?)(?=\n|מספר|תיאור|$)/g,
        /(?:סוג|תיאור)\s*מבנה\s*[:\-]?\s*(.+?)(?=\n|$)/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const description = matches[0][1].trim();
            return {
                value: description,
                confidence: 0.85,
                context: matches[0][0].trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract number of floors
function extractBuildingFloors(text) {
    const patterns = [
        /(?:מספר\s+קומות|קומות)\s*[:\-]?\s*(\d+)/g,
        /(\d+)\s*קומות/g,
        /קומה\s+(\d+)/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const floors = parseInt(matches[0][1]);
            return {
                value: floors,
                confidence: 0.9,
                context: matches[0][0].trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract number of sub-plots per building
function extractBuildingSubPlotsCount(text) {
    const patterns = [
        /(?:מספר\s+תתי?\s*חלקות|תתי?\s*חלקות)\s*[:\-]?\s*(\d+)/g,
        /(\d+)\s*תתי?\s*חלקות/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const count = parseInt(matches[0][1]);
            return {
                value: count,
                confidence: 0.85,
                context: matches[0][0].trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract building address
function extractBuildingAddress(text) {
    const patterns = [
        /(?:כתובת|רחוב|שכונת)\s*[:\-]?\s*(.+?)(?=\n|מבנה|תיאור|$)/g,
        /ב?רחוב\s+(.+?)(?:\s+\d+)?(?=\n|,|$)/g,
        /(?:שכונה|אזור)\s*[:\-]?\s*(.+?)(?=\n|$)/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const address = matches[0][1].trim();
            return {
                value: address,
                confidence: 0.8,
                context: matches[0][0].trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract total sub-plots across all buildings
function extractTotalSubPlots(text) {
    const patterns = [
        /(?:סה[״"]כ|סה״כ|סהכ|סך הכל)\s*תתי?\s*חלקות\s*[:\-]?\s*(\d+)/g,
        /(?:כללי|סה[״"]כ)\s*(\d+)\s*תתי?\s*חלקות/g
    ];
    
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
            const total = parseInt(matches[0][1]);
            return {
                value: total,
                confidence: 0.9,
                context: matches[0][0].trim(),
                raw_match: matches[0][0]
            };
        }
    }
    
    return { value: null, confidence: 0.0, context: 'לא נמצא', raw_match: null };
}

// Extract individual sub-plot details
function extractSubPlotDetails(text) {
    const subPlots = [];
    
    // Look for sub-plot sections
    const subPlotSections = text.split(/(?=תת\s*חלקה\s*מס[פר]*\.?\s*\d+)/);
    
    subPlotSections.forEach(section => {
        const subPlot = extractSingleSubPlot(section);
        if (subPlot && subPlot.sub_plot_number) {
            subPlots.push(subPlot);
        }
    });
    
    return {
        value: subPlots,
        confidence: subPlots.length > 0 ? 0.8 : 0.0,
        context: `נמצאו ${subPlots.length} תתי חלקות`,
        raw_match: null
    };
}

function extractSingleSubPlot(text) {
    const subPlot = {};
    
    // Sub-plot number
    const subPlotNumMatch = text.match(/תת\s*חלקה\s*מס[פר]*\.?\s*(\d+)/);
    if (subPlotNumMatch) {
        subPlot.sub_plot_number = parseInt(subPlotNumMatch[1]);
    }
    
    // Building number
    const buildingNumMatch = text.match(/מבנה\s*(?:מס[פר]*\.?)?\s*(\d+)/);
    if (buildingNumMatch) {
        subPlot.building_number = parseInt(buildingNumMatch[1]);
    }
    
    // Area
    const areaMatch = text.match(/שטח\s*[:\-]?\s*([\d,\.]+)\s*(?:מ[״"]ר|מטר)/);
    if (areaMatch) {
        subPlot.area = parseFloat(areaMatch[1].replace(',', '.'));
    }
    
    // Description
    const descMatch = text.match(/תיאור\s*[:\-]?\s*(.+?)(?=\n|קומה|שטח|$)/);
    if (descMatch) {
        subPlot.description = descMatch[1].trim();
    }
    
    // Floor
    const floorMatch = text.match(/קומה\s*[:\-]?\s*(\d+|קרקע|מרתף)/);
    if (floorMatch) {
        const floorValue = floorMatch[1];
        if (floorValue === 'קרקע') {
            subPlot.floor = 0;
        } else if (floorValue === 'מרתף') {
            subPlot.floor = -1;
        } else {
            subPlot.floor = parseInt(floorValue);
        }
    }
    
    // Shared property parts
    const sharedMatch = text.match(/חלקים\s*ברכוש\s*המשותף\s*[:\-]?\s*(.+?)(?=\n|הצמדות|$)/);
    if (sharedMatch) {
        subPlot.shared_property_parts = sharedMatch[1].trim();
    }
    
    // Attachments
    subPlot.attachments = extractAttachments(text);
    
    // Non-attachment areas
    const nonAttachMatch = text.match(/שטחים\s*שאינם\s*בהצמדות\s*[:\-]?\s*(.+?)(?=\n|$)/);
    if (nonAttachMatch) {
        subPlot.non_attachment_areas = nonAttachMatch[1].trim();
    }
    
    return subPlot;
}

function extractAttachments(text) {
    const attachments = [];
    
    // Look for attachment patterns
    const attachmentPatterns = [
        /הצמדה\s*[:\-]?\s*(.+?)(?:\n|$)/g,
        /(?:חניה|מחסן|מרפסת|גינה)\s*[:\-]?\s*(.+?)(?:\n|$)/g
    ];
    
    attachmentPatterns.forEach(pattern => {
        const matches = Array.from(text.matchAll(pattern));
        matches.forEach(match => {
            const attachment = {};
            const attachmentText = match[1];
            
            // Description
            attachment.description = attachmentText.trim();
            
            // Blueprint marking
            const markingMatch = attachmentText.match(/סימון\s*בתשריט\s*[:\-]?\s*(.+?)(?:\s|$)/);
            if (markingMatch) {
                attachment.blueprint_marking = markingMatch[1];
            }
            
            // Blueprint color
            const colorMatch = attachmentText.match(/צבע\s*בתשריט\s*[:\-]?\s*(.+?)(?:\s|$)/);
            if (colorMatch) {
                attachment.blueprint_color = colorMatch[1];
            }
            
            // Attachment area
            const areaMatch = attachmentText.match(/שטח\s*(?:הצמדה)?\s*[:\-]?\s*([\d,\.]+)\s*(?:מ[״"]ר|מטר)/);
            if (areaMatch) {
                attachment.area = parseFloat(areaMatch[1].replace(',', '.'));
            }
            
            attachments.push(attachment);
        });
    });
    
    return attachments;
}

// Main extraction function
function extractAllSharedBuildingFields(text) {
    const results = {
        order_issue_date: extractOrderIssueDate(text),
        building_description: extractBuildingDescription(text),
        building_floors: extractBuildingFloors(text),
        building_sub_plots_count: extractBuildingSubPlotsCount(text),
        building_address: extractBuildingAddress(text),
        total_sub_plots: extractTotalSubPlots(text),
        sub_plots: extractSubPlotDetails(text)
    };
    
    // Calculate overall confidence
    const confidenceValues = Object.values(results)
        .map(result => result.confidence)
        .filter(conf => conf > 0);
    
    results.overall_confidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length 
        : 0.0;
    
    return results;
}

export {
    extractOrderIssueDate,
    extractBuildingDescription,
    extractBuildingFloors,
    extractBuildingSubPlotsCount,
    extractBuildingAddress,
    extractTotalSubPlots,
    extractSubPlotDetails,
    extractAllSharedBuildingFields
};