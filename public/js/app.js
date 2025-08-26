// Main application JavaScript
class ShamayApp {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.progressSection = document.getElementById('progressSection');
        this.errorSection = document.getElementById('errorSection');
        this.recentList = document.getElementById('recentList');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadRecentExtractions();
    }
    
    setupEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        
        // Click to upload
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
    }
    
    async handleFileUpload(file) {
        // Validate file
        if (!file.type === 'application/pdf') {
            this.showError('אנא בחר קובץ PDF בלבד');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showError('הקובץ גדול מדי. גודל מקסימלי: 10MB');
            return;
        }
        
        // Show progress
        this.showProgress();
        this.updateProgress(10, 'מעלה קובץ...');
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('document', file);
            
            // Upload and process
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.updateProgress(50, 'מעבד מסמך...');
            
            const result = await response.json();
            
            if (result.success) {
                this.updateProgress(100, 'הושלם!');
                this.completeAllSteps();
                
                // Wait a moment then redirect to results
                setTimeout(() => {
                    window.location.href = `/results/${result.data.id}`;
                }, 1500);
            } else {
                throw new Error(result.message || 'עיבוד המסמך נכשל');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`שגיאה: ${error.message}`);
        }
    }
    
    showProgress() {
        document.querySelector('.upload-section').style.display = 'none';
        this.progressSection.style.display = 'block';
        this.errorSection.style.display = 'none';
    }
    
    updateProgress(percentage, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = text;
        
        // Update steps
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (percentage >= (index + 1) * 20) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (percentage >= index * 20) {
                step.classList.add('active');
            }
        });
    }
    
    completeAllSteps() {
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => {
            step.classList.add('completed');
            step.classList.remove('active');
        });
    }
    
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        
        document.querySelector('.upload-section').style.display = 'none';
        this.progressSection.style.display = 'none';
        this.errorSection.style.display = 'block';
    }
    
    async loadRecentExtractions() {
        try {
            const response = await fetch('/api/recent?limit=5');
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                this.displayRecentExtractions(result.data);
            } else {
                this.recentList.innerHTML = '<div class="loading">אין עיבודים קודמים</div>';
            }
        } catch (error) {
            console.error('Failed to load recent extractions:', error);
            this.recentList.innerHTML = '<div class="loading">שגיאה בטעינת העיבודים האחרונים</div>';
        }
    }
    
    displayRecentExtractions(extractions) {
        this.recentList.innerHTML = extractions.map(item => {
            const confidence = (item.confidence_overall * 100).toFixed(1);
            const confidenceClass = confidence > 80 ? 'high' : confidence > 60 ? 'medium' : 'low';
            const date = new Date(item.created_at).toLocaleDateString('he-IL');
            
            return `
                <div class="recent-item" onclick="window.location.href='/results/${item.id}'">
                    <div class="recent-item-header">
                        <div class="recent-item-title">${item.document_filename || 'מסמך ללא שם'}</div>
                        <div class="recent-item-date">${date}</div>
                    </div>
                    <div class="recent-item-details">
                        <span class="confidence-badge confidence-${confidenceClass}">
                            ${confidence}% אמינות
                        </span>
                        ${item.gush ? `גוש: ${item.gush}` : ''}
                        ${item.chelka ? ` | חלקה: ${item.chelka}` : ''}
                        ${item.owners_count ? ` | ${item.owners_count} בעלים` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Reset upload form
function resetUpload() {
    location.reload();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShamayApp();
});