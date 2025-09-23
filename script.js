class SecureImageUploader {
    constructor() {
        this.files = [];
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        this.maxFiles = parseInt(process.env.MAX_FILES) || 10;
        this.webhookUrl = process.env.WEBHOOK_URL || 'https://your-n8n-webhook-url.com/webhook/upload';
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.status = document.getElementById('status');
    }
    
    bindEvents() {
        // Click to browse
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag and drop
        this.uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadZone.addEventListener('drop', this.handleDrop.bind(this));
        
        // Buttons
        this.uploadBtn.addEventListener('click', this.uploadFiles.bind(this));
        this.clearBtn.addEventListener('click', this.clearFiles.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('drag-over');
        this.handleFiles(e.dataTransfer.files);
    }
    
    handleFiles(fileList) {
        const validFiles = this.validateFiles(Array.from(fileList));
        
        if (validFiles.length === 0) return;
        
        // Check total file count
        if (this.files.length + validFiles.length > this.maxFiles) {
            this.showStatus(`Maximum ${this.maxFiles} files allowed`, 'error');
            return;
        }
        
        this.files.push(...validFiles);
        this.renderFileList();
        this.updateButtons();
        this.showStatus(`${validFiles.length} file(s) added`);
    }
    
    validateFiles(files) {
        const validFiles = [];
        const errors = [];
        
        files.forEach(file => {
            // Check file type
            if (!this.allowedTypes.includes(file.type)) {
                errors.push(`${file.name}: Invalid file type (accepted: images, PDF)`);
                return;
            }
            
            // Check file size
            if (file.size > this.maxFileSize) {
                const sizeMB = Math.round(this.maxFileSize / (1024 * 1024));
                errors.push(`${file.name}: File too large (max ${sizeMB}MB)`);
                return;
            }
            
            // Check for duplicates
            if (this.files.some(f => f.name === file.name && f.size === file.size)) {
                errors.push(`${file.name}: File already added`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (errors.length > 0) {
            this.showStatus(errors.join('\n'), 'error');
        }
        
        return validFiles;
    }
    
    renderFileList() {
        this.fileList.innerHTML = this.files.map((file, index) => {
            const fileIcon = file.type === 'application/pdf' ? '📄' : '🖼️';
            return `
                <div class="file-item" data-index="${index}">
                    <span class="file-icon">${fileIcon}</span>
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <span class="file-status status-pending" id="status-${index}">⏳</span>
                </div>
            `;
        }).join('');
    }
    
    updateButtons() {
        this.uploadBtn.disabled = this.files.length === 0;
    }
    
    async uploadFiles() {
        if (this.files.length === 0) return;
        
        this.uploadBtn.disabled = true;
        this.showStatus('Uploading documents...', 'uploading');
        
        const results = await Promise.allSettled(
            this.files.map((file, index) => this.uploadSingleFile(file, index))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - successful;
        
        let statusText = `Upload complete: ${successful} successful`;
        if (failed > 0) {
            statusText += `, ${failed} failed`;
        }
        
        this.showStatus(statusText, failed > 0 ? 'error' : 'success');
        this.uploadBtn.disabled = false;
    }
    
    async uploadSingleFile(file, index) {
        const statusEl = document.getElementById(`status-${index}`);
        
        try {
            statusEl.textContent = '⏳';
            statusEl.className = 'file-status status-uploading';
            
            // Create secure FormData
            const formData = new FormData();
            formData.append('document', file);
            formData.append('timestamp', Date.now());
            formData.append('fileSize', file.size);
            formData.append('fileType', file.type);
            formData.append('source', 'wattco-antenna-configurator');
            
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            statusEl.textContent = '✅';
            statusEl.className = 'file-status status-success';
            
            return { success: true, file: file.name };
            
        } catch (error) {
            console.error(`Upload failed for ${file.name}:`, error);
            statusEl.textContent = '❌';
            statusEl.className = 'file-status status-error';
            
            throw error;
        }
    }
    
    clearFiles() {
        this.files = [];
        this.fileInput.value = '';
        this.fileList.innerHTML = '';
        this.updateButtons();
        this.showStatus('Files cleared');
    }
    
    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status status-${type}`;
        
        // Auto-clear after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                this.status.textContent = '';
                this.status.className = 'status';
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SecureImageUploader();
});
