// Configuration
const CONFIG = {
  n8nWebhook: 'https://muinf.app.n8n.cloud/webhook/107b82af-4720-4ea0-ba3a-f507d0d006e2',
  generationsWebhook: 'https://muinf.app.n8n.cloud/webhook/6af4be09-ab78-451d-ae3e-fb793db9164a'
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const queueList = document.getElementById('queueList');

// State
let uploadedFiles = [];
let isProcessing = false;
let processingTimer = null;

// ========== PAST GENERATIONS ==========

async function loadPastGenerations() {
  try {
    const response = await fetch(CONFIG.generationsWebhook);
    if (!response.ok) throw new Error('Failed to load files');
    
    const files = await response.json();
    renderPastGenerations(files);
  } catch (error) {
    console.error('Error loading files:', error);
    const container = document.querySelector('.doc-grid');
    if (container) {
      container.innerHTML = '<div class="empty-state"><p>No Content Loaded</p></div>';
    }
  }
}

function renderPastGenerations(files) {
  const container = document.querySelector('.doc-grid');
  if (!container) return;
  
  if (!files || files.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No configurations yet</p></div>';
    return;
  }
  
  container.innerHTML = files.map(file => createDocCardHTML(file)).join('');
}

function createDocCardHTML(file) {
  // Extract ID from webViewLink if id not provided
  let fileId = file.id;
  if (!fileId && file.webViewLink) {
    const match = file.webViewLink.match(/\/d\/([^\/]+)/);
    fileId = match ? match[1] : null;
  }
   console.log('Creating card for:', file.name);
  console.log('File ID:', file.id);
  console.log('Full file object:', file);
  
  const date = 'Recent';
  
  const titleMatch = file.name.match(/PWAT-[\w-]+|TGWAT-[\w-]+/);
  const title = titleMatch ? titleMatch[0] : file.name.replace(/\.(html|doc)$/, '');
  
  const downloadLink = `https://drive.google.com/uc?export=download&id=${file.id}`;
  
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
        <button class="action-btn" onclick="viewFile('${file.id}', '${file.name}', '${title}')" title="View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="downloadFile('${downloadLink}', '${file.name}')" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="alert('Delete requires n8n webhook setup')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function viewFile(fileId, fileName, title) {
  const modal = document.getElementById('docModal');
  const frame = document.getElementById('docFrame');
  const modalTitle = document.getElementById('modalTitle');
  
  modalTitle.textContent = title || 'Document Preview';
  frame.src = `https://drive.google.com/file/d/${fileId}/preview`;
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
      <p class="success-subtitle">Check Google Drive for your document</p>
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
    const fileContents = await Promise.all(
      uploadedFiles.map(file => readFileAsText(file))
    );

    const payload = {
      files: uploadedFiles.map((file, idx) => ({
        name: file.name,
        content: fileContents[idx],
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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', loadPastGenerations);
setInterval(loadPastGenerations, 90000);
