// Configuration
const CONFIG = {
  n8nWebhook: 'https://muinf.app.n8n.cloud/webhook/107b82af-4720-4ea0-ba3a-f507d0d006e2', // BOM generation
  generationsWebhook: 'https://muinf.app.n8n.cloud/webhook/6af4be09-ab78-451d-ae3e-fb793db9164a' // List files from Drive
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const queueList = document.getElementById('queueList');

// State
let uploadedFiles = [];

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
      container.innerHTML = '<div class="empty-state"><p>Error loading files</p></div>';
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
  const date = new Date(file.modifiedTime).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const titleMatch = file.name.match(/WattCO_Config_(.+?)_\d{4}/);
  const title = titleMatch ? titleMatch[1].replace(/_/g, ' ') : file.name.replace('.html', '');
  
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
        <button class="action-btn" onclick="viewFile('${file.webViewLink}')" title="View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="downloadFile('${file.webContentLink}')" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
        <button class="action-btn" onclick="deleteFile('${file.id}', '${title}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function viewFile(url) {
  window.open(url, '_blank');
}

function downloadFile(url) {
  window.open(url, '_blank');
}

async function deleteFile(fileId, title) {
  if (!confirm(`Delete "${title}"?`)) return;
  
  // You'll need to create a delete webhook in n8n
  alert('Delete functionality requires an n8n delete webhook. File ID: ' + fileId);
  // TODO: Implement delete webhook call
}

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
    uploadZone.innerHTML = `<p>${uploadedFiles.length} file(s) selected</p>`;
  } else {
    uploadZone.innerHTML = '<p>Drop spec files here or <span class="browse-text">browse</span></p>';
  }
}

function updateQueue() {
  if (uploadedFiles.length === 0) {
    queueList.innerHTML = '<div class="empty">Nothing queued</div>';
  } else {
    queueList.innerHTML = uploadedFiles.map((file, idx) => `
      <div class="doc-card" style="margin-bottom: 0.5rem;">
        <div>
          <div class="doc-title">${file.name}</div>
          <div class="doc-meta">${formatFileSize(file.size)}</div>
        </div>
        <div class="doc-actions">
          <button onclick="removeFromQueue(${idx})" title="Remove">🗑</button>
        </div>
      </div>
    `).join('');
  }
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
  startBtn.textContent = 'Processing...';

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

    alert('Configuration generated successfully! Check your email and Google Drive.');
    
    uploadedFiles = [];
    updateQueue();
    updateUploadZone();
    
    await loadPastGenerations();

  } catch (error) {
    console.error('Error:', error);
    alert('Error processing files: ' + error.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start';
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

// Refresh every 90 seconds
setInterval(loadPastGenerations, 90000);
