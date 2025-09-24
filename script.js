// Configuration
const CONFIG = {
  n8nWebhook: 'YOUR_N8N_WEBHOOK_URL_HERE', // For BOM generation
  equipmentAPI: '/api/equipment', // Replace with your equipment API endpoint
  generationsAPI: '/api/generations', // Replace with your generations API endpoint
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const queueList = document.getElementById('queueList');
const equipmentList = document.getElementById('equipmentList');
const addEquipmentBtn = document.getElementById('addEquipmentBtn');

// State
let uploadedFiles = [];
let equipmentItems = [];
let pastGenerations = [];

// ========== EQUIPMENT CATALOGUE API ==========

async function loadEquipment() {
  try {
    const response = await fetch(CONFIG.equipmentAPI);
    if (!response.ok) throw new Error('Failed to load equipment');
    
    equipmentItems = await response.json();
    renderEquipment();
  } catch (error) {
    console.error('Error loading equipment:', error);
    // Fallback to default data
    equipmentItems = [
      { id: 1, name: 'APX 8500 – Radio' },
      { id: 2, name: 'Toughbook – Tablet' }
    ];
    renderEquipment();
  }
}

async function addEquipment(name) {
  try {
    const response = await fetch(CONFIG.equipmentAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to add equipment');
    
    const newItem = await response.json();
    equipmentItems.push(newItem);
    renderEquipment();
    return true;
  } catch (error) {
    console.error('Error adding equipment:', error);
    alert('Failed to add equipment: ' + error.message);
    return false;
  }
}

async function updateEquipment(id, name) {
  try {
    const response = await fetch(`${CONFIG.equipmentAPI}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to update equipment');
    
    const updated = await response.json();
    const index = equipmentItems.findIndex(item => item.id === id);
    if (index !== -1) {
      equipmentItems[index] = updated;
      renderEquipment();
    }
    return true;
  } catch (error) {
    console.error('Error updating equipment:', error);
    alert('Failed to update equipment: ' + error.message);
    return false;
  }
}

async function deleteEquipment(id) {
  try {
    const response = await fetch(`${CONFIG.equipmentAPI}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete equipment');
    
    equipmentItems = equipmentItems.filter(item => item.id !== id);
    renderEquipment();
    return true;
  } catch (error) {
    console.error('Error deleting equipment:', error);
    alert('Failed to delete equipment: ' + error.message);
    return false;
  }
}

function renderEquipment() {
  equipmentList.innerHTML = equipmentItems.map((item) => `
    <li>
      ${item.name}
      <span class="actions">
        <span onclick="handleEditEquipment(${item.id})" style="cursor: pointer;">✏️</span>
        <span onclick="handleDeleteEquipment(${item.id})" style="cursor: pointer;">🗑</span>
      </span>
    </li>
  `).join('');
}

function handleEditEquipment(id) {
  const item = equipmentItems.find(e => e.id === id);
  if (!item) return;
  
  const newName = prompt('Edit equipment name:', item.name);
  if (newName && newName.trim()) {
    updateEquipment(id, newName.trim());
  }
}

function handleDeleteEquipment(id) {
  const item = equipmentItems.find(e => e.id === id);
  if (!item) return;
  
  if (confirm(`Delete "${item.name}"?`)) {
    deleteEquipment(id);
  }
}

addEquipmentBtn.addEventListener('click', () => {
  const name = prompt('Enter equipment name:');
  if (name && name.trim()) {
    addEquipment(name.trim());
  }
});

// ========== PAST GENERATIONS API ==========

async function loadPastGenerations() {
  try {
    const response = await fetch(CONFIG.generationsAPI);
    if (!response.ok) throw new Error('Failed to load past generations');
    
    pastGenerations = await response.json();
    renderPastGenerations();
  } catch (error) {
    console.error('Error loading past generations:', error);
    // Fallback to default data
    pastGenerations = [
      { id: 1, filename: 'East_City_BOM.txt', type: 'BOM', date: '9/24/2025' },
      { id: 2, filename: 'Municipality_Upgrade_BOM.txt', type: 'BOM', date: '9/23/2025' }
    ];
    renderPastGenerations();
  }
}

function renderPastGenerations() {
  const container = document.querySelector('.right-panel');
  const generationsHTML = pastGenerations.map(doc => `
    <div class="doc-card">
      <div>
        <div class="doc-title">${doc.filename}</div>
        <div class="doc-meta">${doc.type} • ${doc.date}</div>
      </div>
      <div class="doc-actions">
        <button onclick="viewDocument(${doc.id})" title="View">👁</button>
        <button onclick="downloadDocument(${doc.id})" title="Download">⬇</button>
        <button onclick="handleDeleteDocument(${doc.id})" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = `<h2>Past Generations</h2>${generationsHTML}`;
}

async function viewDocument(id) {
  try {
    const response = await fetch(`${CONFIG.generationsAPI}/${id}`);
    if (!response.ok) throw new Error('Failed to load document');
    
    const doc = await response.json();
    
    // Open in new window or modal
    const newWindow = window.open('', '_blank');
    newWindow.document.write(doc.html || doc.content);
    newWindow.document.close();
  } catch (error) {
    console.error('Error viewing document:', error);
    alert('Failed to view document: ' + error.message);
  }
}

async function downloadDocument(id) {
  try {
    const response = await fetch(`${CONFIG.generationsAPI}/${id}/download`);
    if (!response.ok) throw new Error('Failed to download document');
    
    const blob = await response.blob();
    const doc = pastGenerations.find(d => d.id === id);
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = doc?.filename || `document-${id}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error downloading document:', error);
    alert('Failed to download document: ' + error.message);
  }
}

async function handleDeleteDocument(id) {
  const doc = pastGenerations.find(d => d.id === id);
  if (!doc) return;
  
  if (!confirm(`Delete "${doc.filename}"?`)) return;
  
  try {
    const response = await fetch(`${CONFIG.generationsAPI}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete document');
    
    pastGenerations = pastGenerations.filter(d => d.id !== id);
    renderPastGenerations();
  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Failed to delete document: ' + error.message);
  }
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
    // Read file contents
    const fileContents = await Promise.all(
      uploadedFiles.map(file => readFileAsText(file))
    );

    // Prepare payload
    const payload = {
      files: uploadedFiles.map((file, idx) => ({
        name: file.name,
        content: fileContents[idx],
        size: file.size
      })),
      equipment: equipmentItems.map(e => e.name),
      timestamp: new Date().toISOString()
    };

    // Send to n8n webhook
    const response = await fetch(CONFIG.n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to process files');

    const result = await response.json();
    
    // Success
    alert('Configuration generated successfully! Check your email.');
    
    // Clear queue
    uploadedFiles = [];
    updateQueue();
    updateUploadZone();
    
    // Refresh past generations
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

document.addEventListener('DOMContentLoaded', async () => {
  await loadEquipment();
  await loadPastGenerations();
});
