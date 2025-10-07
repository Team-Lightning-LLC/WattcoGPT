// Configuration
const CONFIG = {
  n8nWebhook: 'https://muinf.app.n8n.cloud/webhook/107b82af-4720-4ea0-ba3a-f507d0d006e2',
  supabase: {
    url: 'https://ziuyzasstkmvpbdexktr.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdXl6YXNzdGttdnBiZGV4a3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTE0NzcsImV4cCI6MjA3NTMyNzQ3N30.T-6T_8iaT1KG346Tn3wpL8CxtkQ3RUciEjo5RQg0z4Q',
    bucket: 'wattco-output'
  }
};

// Initialize Supabase
const supabase = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const queueList = document.getElementById('queueList');

// State
let uploadedFiles = [];
let isProcessing = false;
let processingTimer = null;

// ========== PAST GENERATIONS - PURE SUPABASE ==========

async function loadPastGenerations() {
  try {
    const { data: files, error } = await supabase.storage
      .from(CONFIG.supabase.bucket)
      .list('', {
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) throw error;
    
    console.log('Files from Supabase:', files);
    renderPastGenerations(files);
  } catch (error) {
    console.error('Error loading files:', error);
    const container = document.querySelector('.doc-grid');
    if (container) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load files</p></div>';
    }
  }
}

function renderPastGenerations(files) {
  const container = document.querySelector('.doc-grid');
  if (!container) return;
  
  console.log('Raw files from Supabase:', files); // DEBUG
  
  // Filter out folder entries and system files
  // Removed the f.id check - Storage list() doesn't return id
  const validFiles = files.filter(f => 
    f.name && 
    !f.name.startsWith('.') && 
    !f.name.endsWith('/')  // Remove folders
  );
  
  console.log('Valid files after filter:', validFiles); // DEBUG
  
  if (validFiles.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No configurations yet</p></div>';
    return;
  }
  
  container.innerHTML = validFiles.map(file => createDocCardHTML(file)).join('');
}
function createDocCardHTML(file) {
  const titleMatch = file.name.match(/PWAT-[\w-]+|TGWAT-[\w-]+/);
  const title = titleMatch ? titleMatch[0] : file.name.replace(/\.(html|doc)$/, '');
  
  const date = file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Recent';
  
  return `
    <div class="doc-card">
      <div class="doc-header">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
        </div>
        <div class="doc-badge">BOM</div>
      </div>
      <div class="doc-content">
        <h3 class="doc-title">${title}</h3>
        <p class="doc-meta">${date}</p>
      </div>
      <div class="doc-actions">
        <button class="action-btn" onclick="viewFile('${file.name}', '${title}')" title="View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="downloadFile('${file.name}')" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="deleteFile('${file.name}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function viewFile(filename, title) {
  const { data } = supabase.storage
    .from(CONFIG.supabase.bucket)
    .getPublicUrl(filename);
  
  const modal = document.getElementById('docModal');
  const frame = document.getElementById('docFrame');
  const modalTitle = document.getElementById('modalTitle');
  
  modalTitle.textContent = title || 'Document Preview';
  frame.src = data.publicUrl;
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function downloadFile(filename) {
  const { data } = supabase.storage
    .from(CONFIG.supabase.bucket)
    .getPublicUrl(filename);
  
  const link = document.createElement('a');
  link.href = data.publicUrl;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function deleteFile(filename) {
  if (!confirm(`Delete ${filename}?`)) return;
  
  try {
    const { error } = await supabase.storage
      .from(CONFIG.supabase.bucket)
      .remove([filename]);
    
    if (error) throw error;
    
    loadPastGenerations(); // Refresh the list
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Failed to delete file');
  }
}

function closeModal() {
  const modal = document.getElementById('docModal');
  const frame = document.getElementById('docFrame');
  
  modal.classList.remove('active');
  frame.src = '';
  document.body.style.overflow = 'auto';
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('docModal');
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ========== FILE UPLOAD & QUEUE ==========

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  uploadedFiles = Array.from(files);
  updateUploadZone();
  updateQueue();
}

function updateUploadZone() {
  if (uploadedFiles.length > 0) {
    uploadZone.innerHTML = `<p class="upload-text">${uploadedFiles.length} file(s) selected</p>`;
  } else {
    uploadZone.innerHTML = `
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
      </svg>
      <p class="upload-text">Drop specification files</p>
      <p class="upload-subtext">or <span class="browse-text">browse to upload</span></p>
    `;
  }
}

function updateQueue() {
  if (isProcessing) return;
  
  if (uploadedFiles.length === 0) {
    queueList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 11l3 3 5-5"/>
        </svg>
        <p>No items queued</p>
      </div>
    `;
  } else {
    queueList.innerHTML = uploadedFiles.map((file, idx) => `
      <div class="queue-item">
        <div class="queue-item-info">
          <div class="queue-item-name">${file.name}</div>
          <div class="queue-item-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="remove-btn" onclick="removeFromQueue(${idx})" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');
  }
}

function showProcessingState() {
  isProcessing = true;
  let timeLeft = 60;
  
  const updateTimer = () => {
    if (!isProcessing) return;
    
    queueList.innerHTML = `
      <div class="processing-state">
        <div class="spinner"></div>
        <p class="processing-title">Generating Configuration</p>
        <p class="processing-time">Estimated: ${timeLeft}s remaining</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${((60 - timeLeft) / 60) * 100}%"></div>
        </div>
      </div>
    `;
    
    if (timeLeft > 0) {
      timeLeft--;
      processingTimer = setTimeout(updateTimer, 1000);
    } else {
      finishProcessing();
    }
  };
  
  updateTimer();
}

function finishProcessing() {
  isProcessing = false;
  if (processingTimer) {
    clearTimeout(processingTimer);
    processingTimer = null;
  }
  
  queueList.innerHTML = `
    <div class="success-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <p class="success-title">Configuration Complete!</p>
      <p class="success-subtitle">File uploaded successfully</p>
    </div>
  `;
  
  loadPastGenerations();
  
  setTimeout(() => {
    if (!isProcessing) {
      updateQueue();
    }
  }, 4000);
}

function removeFromQueue(index) {
  uploadedFiles.splice(index, 1);
  updateQueue();
  updateUploadZone();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ========== START PROCESSING ==========

startBtn.addEventListener('click', async () => {
  if (uploadedFiles.length === 0) {
    alert('Please upload at least one file');
    return;
  }

  startBtn.disabled = true;
  startBtn.innerHTML = '<span>Processing...</span>';
  
  showProcessingState();

  try {
    // Read files as base64 for images
    const fileContents = await Promise.all(
      uploadedFiles.map(file => readFileAsBase64(file))
    );

    const payload = {
      files: uploadedFiles.map((file, idx) => ({
        name: file.name,
        content: fileContents[idx],
        mimeType: file.type,
        size: file.size
      })),
      timestamp: new Date().toISOString()
    };

    const response = await fetch(CONFIG.n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to process files');
    
    uploadedFiles = [];
    updateUploadZone();

  } catch (error) {
    console.error('Error:', error);
    alert('Error processing files: ' + error.message);
    isProcessing = false;
    if (processingTimer) {
      clearTimeout(processingTimer);
      processingTimer = null;
    }
    updateQueue();
  } finally {
    startBtn.disabled = false;
    startBtn.innerHTML = `
      <span>Generate Configuration</span>
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    `;
  }
});

// Add this new function for base64 reading
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result); // Returns data:image/png;base64,xxx
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', loadPastGenerations);
setInterval(loadPastGenerations, 30000); // Refresh every 30 seconds
