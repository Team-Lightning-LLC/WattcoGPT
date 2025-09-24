class SecureImageUploader {
    constructor() {
        this.files = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        this.maxFiles = 10;
        // REPLACE THIS WITH YOUR ACTUAL WEBHOOK URL
        this.webhookUrl = 'https://your-n8n-webhook-url.com/webhook/upload';
        
        this.initElements();
        this.bindEvents();
        console.log('Uploader initialized successfully');
    }
    
    initElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.status = document.getElementById('status');
        
        console.log('Elements found:', {
            uploadZone: !!this.uploadZone,
            fileInput: !!this.fileInput,
            uploadBtn: !!this.uploadBtn
        });
    }
    
    bindEvents() {
        // Click anywhere in upload zone to browse
        this.uploadZone.onclick = () => {
            console.log('Upload zone clicked');
            this.fileInput.click();
        };
        
        // File input change
        this.fileInput.onchange = (e) => {
            console.log('Files selected:', e.target.files.length);
            this.handleFiles(e.target.files);
        };
        
        // Drag and drop
        this.uploadZone.ondragover = (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        };
        
        this.uploadZone.ondragleave = (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
        };
        
        this.uploadZone.ondrop = (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            console.log('Files dropped:', e.dataTransfer.files.length);
            this.handleFiles(e.dataTransfer.files);
        };
        
        // Buttons
        this.uploadBtn.onclick = () => this.uploadFiles();
        this.clearBtn.onclick = () => this.clearFiles();
        
        console.log('Events bound successfully');
    }
    
    handleFiles(fileList) {
        console.log('Processing files:', fileList.length);
        const validFiles = this.validateFiles(Array.from(fileList));
        
        if (validFiles.length === 0) {
            console.log('No valid files');
            return;
        }
        
        if (this.files.length + validFiles.length > this.maxFiles) {
            this.showStatus(`Maximum ${this.maxFiles} files allowed`, 'error');
            return;
        }
        
        this.files.push(...validFiles);
        this.renderFileList();
        this.updateButtons();
        this.showStatus(`${validFiles.length} file(s) added`, 'success');
    }
    
    validateFiles(files) {
        const validFiles = [];
        const errors = [];
        
        files.forEach(file => {
            console.log('Validating:', file.name, file.type, file.size);
            
            if (!this.allowedTypes.includes(file.type)) {
                errors.push(`${file.name}: Invalid type (${file.type})`);
                return;
            }
            
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: Too large (max 10MB)`);
                return;
            }
            
            if (this.files.some(f => f.name === file.name && f.size === file.size)) {
                errors.push(`${file.name}: Already added`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (errors.length > 0) {
            console.error('Validation errors:', errors);
            this.showStatus(errors.join('\n'), 'error');
        }
        
        return validFiles;
    }
    
    renderFileList() {
        this.fileList.innerHTML = this.files.map((file, index) => {
            const fileIcon = file.type === 'application/pdf' ? '📄' : '🖼️';
            const sizeKB = (file.size / 1024).toFixed(1);
            return `
                <div class="file-item" data-index="${index}">
                    <span class="file-icon">${fileIcon}</span>
                    <span class="file-name" title="${file.name}">${file.name} (${sizeKB} KB)</span>
                    <span class="file-status status-pending" id="status-${index}">⏳</span>
                </div>
            `;
        }).join('');
    }
    
    updateButtons() {
        this.uploadBtn.disabled = this.files.length === 0;
        this.clearBtn.disabled = this.files.length === 0;
    }
    
    async uploadFiles() {
        if (this.files.length === 0) return;
        
        console.log('Starting upload of', this.files.length, 'files');
        this.uploadBtn.disabled = true;
        this.clearBtn.disabled = true;
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
        
        console.log('Upload results:', statusText);
        this.showStatus(statusText, failed > 0 ? 'error' : 'success');
        this.uploadBtn.disabled = false;
        this.clearBtn.disabled = false;
    }
    
    async uploadSingleFile(file, index) {
        const statusEl = document.getElementById(`status-${index}`);
        
        try {
            console.log('Uploading:', file.name);
            statusEl.textContent = '📤';
            statusEl.className = 'file-status status-uploading';
            
            const formData = new FormData();
            formData.append('document', file);
            formData.append('timestamp', Date.now());
            formData.append('fileSize', file.size);
            formData.append('fileType', file.type);
            formData.append('fileName', file.name);
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
            
            const result = await response.json();
            console.log('Upload success:', file.name, result);
            
            statusEl.textContent = '✅';
            statusEl.className = 'file-status status-success';
            
            return { success: true, file: file.name };
            
        } catch (error) {
            console.error('Upload failed:', file.name, error);
            statusEl.textContent = '❌';
            statusEl.className = 'file-status status-error';
            statusEl.title = error.message;
            
            throw error;
        }
    }
    
    clearFiles() {
        console.log('Clearing all files');
        this.files = [];
        this.fileInput.value = '';
        this.fileList.innerHTML = '';
        this.updateButtons();
        this.showStatus('Files cleared', 'info');
    }
    
    showStatus(message, type = 'info') {
        console.log('Status:', type, message);
        this.status.textContent = message;
        this.status.className = `status status-${type}`;
        
        if (type !== 'error' && type !== 'uploading') {
            setTimeout(() => {
                this.status.textContent = '';
                this.status.className = 'status';
            }, 5000);
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.uploader = new SecureImageUploader();
    });
} else {
    window.uploader = new SecureImageUploader();
}
