// Results page JavaScript
class ResultsPage {
    constructor() {
        this.extractionId = this.getExtractionId();
        this.resultsGrid = document.getElementById('resultsGrid');
        this.documentTitle = document.getElementById('documentTitle');
        
        this.init();
    }
    
    getExtractionId() {
        const path = window.location.pathname;
        const match = path.match(/\/results\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }
    
    async init() {
        if (!this.extractionId) {
            this.showError('מזהה חילוץ לא תקין');
            return;
        }
        
        try {
            const response = await fetch(`/api/results/${this.extractionId}`);
            const result = await response.json();
            
            if (result.success) {
                this.displayResults(result.data);
            } else {
                this.showError(result.message || 'לא נמצאו תוצאות');
            }
        } catch (error) {
            console.error('Error loading results:', error);
            this.showError('שגיאה בטעינת התוצאות');
        }
    }
    
    displayResults(data) {
        this.documentTitle.innerHTML = `
            <h2>${data.document_filename || 'מסמך ללא שם'}</h2>
            <div>מספר רשומה: ${data.id} | עובד ב: ${new Date(data.created_at).toLocaleString('he-IL')}</div>
        `;
        
        // Create sections for all field groups
        const sections = [
            {
                title: '📄 מידע כללי על המסמך',
                icon: '📄',
                fields: this.getDocumentFields(data)
            },
            {
                title: '🏢 פרטי הנכס',
                icon: '🏢', 
                fields: this.getPropertyFields(data)
            },
            {
                title: '🏠 פרטי היחידה/דירה',
                icon: '🏠',
                fields: this.getUnitFields(data)
            },
            {
                title: '🚗 הצמדות ונספחים',
                icon: '🚗',
                fields: this.getAttachmentsFields(data)
            },
            {
                title: '👥 בעלויות',
                icon: '👥',
                fields: this.getOwnershipFields(data)
            },
            {
                title: '📝 הערות והודעות',
                icon: '📝',
                fields: this.getNotesFields(data)
            },
            {
                title: '🛤️ זיקות הנאה',
                icon: '🛤️',
                fields: this.getEasementsFields(data)
            },
            {
                title: '💰 משכנתאות',
                icon: '💰',
                fields: this.getMortgageFields(data)
            },
            {
                title: '🎯 ציוני אמינות',
                icon: '🎯',
                fields: this.getConfidenceFields(data)
            },
            {
                title: '🔧 מטא נתונים',
                icon: '🔧',
                fields: this.getMetadataFields(data)
            }
        ];
        
        this.resultsGrid.innerHTML = sections.map(section => 
            this.createFieldGroup(section.title, section.fields)
        ).join('');
    }
    
    createFieldGroup(title, fields) {
        if (!fields || fields.length === 0) return '';
        
        return `
            <div class="field-group">
                <div class="field-group-header">${title}</div>
                <div class="field-group-content">
                    ${fields.map(field => this.createFieldItem(field)).join('')}
                </div>
            </div>
        `;
    }
    
    createFieldItem(field) {
        const valueClass = field.isHebrew ? 'field-value hebrew' : 'field-value';
        const confidenceIndicator = field.confidence ? this.createConfidenceIndicator(field.confidence) : '';
        
        let displayValue = field.value;
        
        // Handle different value types
        if (field.value === null || field.value === undefined || field.value === '') {
            displayValue = '<span style="color: #999;">לא זמין</span>';
        } else if (typeof field.value === 'object') {
            displayValue = `<div class="json-data">${JSON.stringify(field.value, null, 2)}</div>`;
        } else if (field.type === 'currency') {
            displayValue = `₪${Number(field.value).toLocaleString()}`;
        } else if (field.type === 'area') {
            displayValue = `${field.value} מ״ר`;
        } else if (field.type === 'date') {
            displayValue = new Date(field.value).toLocaleDateString('he-IL');
        }
        
        return `
            <div class="field-item">
                <div class="field-label">${field.label}${confidenceIndicator}</div>
                <div class="${valueClass}">${displayValue}</div>
            </div>
        `;
    }
    
    createConfidenceIndicator(confidence) {
        const percentage = (confidence * 100).toFixed(1);
        const level = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';
        
        return `
            <div class="confidence-indicator">
                <div class="confidence-circle ${level}"></div>
                <span>${percentage}%</span>
            </div>
        `;
    }
    
    getDocumentFields(data) {
        return [
            { label: 'לשכת רישום מקרקעין', value: data.registration_office, isHebrew: true },
            { label: 'תאריך הפקה', value: data.issue_date, type: 'date' },
            { label: 'מתי הופק נסח טאבו', value: data.tabu_extract_date, type: 'date' },
            { label: 'שם הקובץ', value: data.document_filename, isHebrew: true }
        ];
    }
    
    getPropertyFields(data) {
        return [
            { label: 'גוש', value: data.gush, confidence: data.confidence_property_info },
            { label: 'חלקה', value: data.chelka },
            { label: 'תת חלקה', value: data.sub_chelka },
            { label: 'שטח קרקע של כל החלקה', value: data.total_plot_area, type: 'area' },
            { label: 'תקנון', value: data.regulation_type, isHebrew: true },
            { label: 'תתי חלקות (כמה יש)', value: data.sub_plots_count },
            { label: 'כמה מבנים', value: data.buildings_count },
            { label: 'כתובת (מהנסח טאבו AS IS)', value: data.address_from_tabu, isHebrew: true }
        ];
    }
    
    getUnitFields(data) {
        return [
            { label: 'תיאור הדירה', value: data.unit_description, isHebrew: true },
            { label: 'קומה', value: data.floor, isHebrew: true },
            { label: 'שטח רשום', value: data.registered_area, type: 'area' },
            { label: 'שטח דירה רשום', value: data.apartment_registered_area, type: 'area' },
            { label: 'שטח מרפסת', value: data.balcony_area, type: 'area' },
            { label: 'רכוש משותף', value: data.shared_property, isHebrew: true },
            { label: 'מבנה (מספר מבנה)', value: data.building_number },
            { label: 'שטחים נוספים', value: data.additional_areas }
        ];
    }
    
    getAttachmentsFields(data) {
        return [
            { label: 'הצמדות (מלא)', value: data.attachments },
            { label: 'הצמדות - סימן בתשריט', value: data.attachments_symbol },
            { label: 'הצמדות - צבע בתשריט', value: data.attachments_color, isHebrew: true },
            { label: 'הצמדות - תיאור הצמדה', value: data.attachments_description, isHebrew: true },
            { label: 'הצמדות - שטח במטר', value: data.attachments_area, type: 'area' }
        ];
    }
    
    getOwnershipFields(data) {
        return [
            { label: 'בעלים (מלא)', value: data.owners },
            { label: 'מספר בעלים', value: data.owners_count },
            { label: 'סוג הבעלות', value: data.ownership_type, isHebrew: true },
            { label: 'זכויות', value: data.rights, isHebrew: true }
        ];
    }
    
    getNotesFields(data) {
        return [
            { label: 'הערות לכל החלקה', value: data.plot_notes, isHebrew: true },
            { label: 'הערות - מהות פעולה', value: data.notes_action_type, isHebrew: true },
            { label: 'הערות - שם המוטב', value: data.notes_beneficiary, isHebrew: true }
        ];
    }
    
    getEasementsFields(data) {
        return [
            { label: 'זיקות הנאה - מהות', value: data.easements_essence, isHebrew: true },
            { label: 'זיקות הנאה - תיאור', value: data.easements_description, isHebrew: true }
        ];
    }
    
    getMortgageFields(data) {
        return [
            { label: 'משכנתאות (מלא)', value: data.mortgages },
            { label: 'משכנתאות - מהות', value: data.mortgage_essence, isHebrew: true },
            { label: 'משכנתאות - דרגה', value: data.mortgage_rank, isHebrew: true },
            { label: 'משכנתאות - בעלי המשכנתא', value: data.mortgage_lenders, isHebrew: true },
            { label: 'משכנתאות - שם הלווים', value: data.mortgage_borrowers, isHebrew: true },
            { label: 'משכנתאות - סכום', value: data.mortgage_amount, type: 'currency' },
            { label: 'משכנתאות - חלק בנכס', value: data.mortgage_property_share, isHebrew: true }
        ];
    }
    
    getConfidenceFields(data) {
        return [
            { label: 'אמינות - מידע מסמך', value: (data.confidence_document_info * 100).toFixed(1) + '%', confidence: data.confidence_document_info },
            { label: 'אמינות - מידע נכס', value: (data.confidence_property_info * 100).toFixed(1) + '%', confidence: data.confidence_property_info },
            { label: 'אמינות - מידע יחידה', value: (data.confidence_unit_info * 100).toFixed(1) + '%', confidence: data.confidence_unit_info },
            { label: 'אמינות - בעלות', value: (data.confidence_ownership * 100).toFixed(1) + '%', confidence: data.confidence_ownership },
            { label: 'אמינות - הצמדות', value: (data.confidence_attachments * 100).toFixed(1) + '%', confidence: data.confidence_attachments },
            { label: 'אמינות - הערות', value: (data.confidence_notes * 100).toFixed(1) + '%', confidence: data.confidence_notes },
            { label: 'אמינות - זיקות הנאה', value: (data.confidence_easements * 100).toFixed(1) + '%', confidence: data.confidence_easements },
            { label: 'אמינות - משכנתאות', value: (data.confidence_mortgages * 100).toFixed(1) + '%', confidence: data.confidence_mortgages },
            { label: 'אמינות כללית', value: (data.confidence_overall * 100).toFixed(1) + '%', confidence: data.confidence_overall }
        ];
    }
    
    getMetadataFields(data) {
        return [
            { label: 'שיטת חילוץ', value: data.extraction_method },
            { label: 'מודל AI', value: data.model_used },
            { label: 'אורך טקסט', value: data.text_length ? `${data.text_length.toLocaleString()} תווים` : null },
            { label: 'זמן חילוץ', value: data.extracted_at, type: 'date' },
            { label: 'נוצר במערכת', value: data.created_at, type: 'date' }
        ];
    }
    
    showError(message) {
        this.resultsGrid.innerHTML = `
            <div class="field-group">
                <div class="field-group-header" style="background: #e74c3c;">❌ שגיאה</div>
                <div class="field-group-content">
                    <div style="padding: 20px; text-align: center; color: #e74c3c;">
                        ${message}
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize results page
document.addEventListener('DOMContentLoaded', () => {
    new ResultsPage();
});