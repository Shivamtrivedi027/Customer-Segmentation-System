/**
 * Customer Segmentation System - Frontend Application Logic
 * -----------------------------------------------------------
 * Handles CSV file upload, sample data execution, UI state transitions,
 * dynamic metric rendering, scatter plot display, and policy modals.
 */

// Configuration: Backend API base URL (dynamically verified with service signature)
let API_BASE_URL = null;

async function detectBackend() {
  const candidatePorts = [5000, 5001, 5005, 5050, 8000];
  for (const port of candidatePorts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.service === 'customer-segmentation-backend') {
          API_BASE_URL = `http://127.0.0.1:${port}`;
          console.log(`Connected to Customer Segmentation Backend at ${API_BASE_URL}`);
          return true;
        }
      }
    } catch (e) {
      // check next port
    }
  }
  return false;
}


// DOM Element References
const uploadForm = document.getElementById('upload-form');
const csvFileInput = document.getElementById('csv-file-input');
const dropzone = document.getElementById('dropzone');
const dropzoneText = document.getElementById('dropzone-text');
const selectedFileDisplay = document.getElementById('selected-file-display');
const fileNameText = document.getElementById('file-name-text');
const btnClearFile = document.getElementById('btn-clear-file');
const btnSubmit = document.getElementById('btn-submit');
const btnSpinner = document.getElementById('btn-spinner');
const btnUseSample = document.getElementById('btn-use-sample');
const heroSampleBtn = document.getElementById('hero-sample-btn');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const loadingSection = document.getElementById('loading-section');
const resultsWrapper = document.getElementById('results-wrapper');

// Result Metrics & Cards
const metricTotal = document.getElementById('metric-total');
const metricK = document.getElementById('metric-k');
const clusterCardsContainer = document.getElementById('cluster-cards-container');
const clusterPlotImg = document.getElementById('cluster-plot-img');

// Modals
const policyModal = document.getElementById('policy-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalOkBtn = document.getElementById('modal-ok-btn');
const privacyLink = document.getElementById('privacy-link');
const termsLink = document.getElementById('terms-link');

// Currently selected file
let currentFile = null;

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  detectBackend();
  setupFileUploadHandlers();
  setupFormSubmitHandlers();
  setupSampleDataHandlers();
  setupModalHandlers();
});


/**
 * Configure file selection, drag-and-drop, and clearing.
 */
function setupFileUploadHandlers() {
  // Input change
  csvFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      const file = dt.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        handleFileSelected(file);
        try {
          const container = new DataTransfer();
          container.items.add(file);
          csvFileInput.files = container.files;
        } catch (syncErr) {
          // ignore if DataTransfer constructor not supported
        }
      } else {
        showError('Please upload a valid .csv file.');
      }
    }
  });

  // Clear file button
  btnClearFile.addEventListener('click', () => {
    clearSelectedFile();
  });
}

function handleFileSelected(file) {
  currentFile = file;
  fileNameText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  selectedFileDisplay.style.display = 'flex';
  dropzoneText.textContent = `Replace ${file.name}`;
  hideError();
}

function clearSelectedFile() {
  currentFile = null;
  csvFileInput.value = '';
  fileNameText.textContent = 'None';
  selectedFileDisplay.style.display = 'none';
  dropzoneText.textContent = 'Choose CSV file or drag and drop here';
}

/**
 * Configure form submission.
 */
function setupFormSubmitHandlers() {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Fallback: check if file input has files if currentFile was not set
    if (!currentFile && csvFileInput.files && csvFileInput.files.length > 0) {
      currentFile = csvFileInput.files[0];
    }

    if (!currentFile) {
      showError('Please select a CSV file first, or click "Use Sample Dataset" to test with pre-loaded data.');
      return;
    }

    const formData = new FormData();
    formData.append('file', currentFile);
    await executeAnalysis(formData);
  });
}

/**
 * Quick analysis using the pre-loaded sample dataset.
 */
function setupSampleDataHandlers() {
  const triggerSample = async () => {
    hideError();
    // Empty FormData tells backend to use default sample dataset
    const formData = new FormData();
    await executeAnalysis(formData);
  };

  btnUseSample.addEventListener('click', triggerSample);
  if (heroSampleBtn) {
    heroSampleBtn.addEventListener('click', triggerSample);
  }
}

/**
 * Execute clustering analysis request against Flask backend.
 */
async function executeAnalysis(formData) {
  setLoadingState(true);
  hideError();

  try {
    const isConnected = await detectBackend();
    if (!isConnected || !API_BASE_URL) {
      throw new Error(
        'Customer Segmentation Backend is not running or unreachable on port 5000/5001. ' +
        'Please start the backend using run.bat or run "python app.py" inside the backend folder.'
      );
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData
    });


    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (parseErr) {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.success) {
      renderResults(data);
      // Smoothly scroll to results
      resultsWrapper.style.display = 'block';
      resultsWrapper.scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error(data.error || 'Clustering analysis failed.');
    }

  } catch (err) {
    console.error('Analysis error:', err);
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError('Cannot connect to the Flask server. Please make sure backend/app.py is running on http://127.0.0.1:5000.');
    } else {
      showError(err.message || 'An unexpected error occurred during analysis.');
    }
  } finally {
    setLoadingState(false);
  }
}

/**
 * Render clustering output dynamically.
 */
function renderResults(data) {
  // Update top metrics
  metricTotal.textContent = data.total_customers || 0;
  metricK.textContent = data.cluster_count || 3;

  // Render scatter plot image
  if (data.plot_base64) {
    clusterPlotImg.src = data.plot_base64;
  } else if (data.plot_image_path) {
    clusterPlotImg.src = `${API_BASE_URL}${data.plot_image_path}?t=${new Date().getTime()}`;
  }

  // Render cluster summary cards
  clusterCardsContainer.innerHTML = '';

  const badgeClasses = {
    1: 'badge-blue',
    2: 'badge-green',
    3: 'badge-gray'
  };

  data.clusters.forEach(cluster => {
    const card = document.createElement('div');
    card.className = 'cluster-summary-card';

    const badgeClass = badgeClasses[cluster.cluster_id] || 'badge-blue';

    card.innerHTML = `
      <div class="cluster-card-header">
        <span class="cluster-badge ${badgeClass}">Cluster ${cluster.cluster_id}</span>
        <span class="cluster-share">${cluster.count} customers (${cluster.percentage}%)</span>
      </div>
      <h3 class="cluster-title">${escapeHtml(cluster.name)}</h3>
      <p class="cluster-desc">${escapeHtml(cluster.description)}</p>
      <div class="cluster-stats-row">
        <div class="cluster-stat-item">
          <span class="stat-title">Avg Income</span>
          <span class="stat-num">$${cluster.avg_income}k</span>
        </div>
        <div class="cluster-stat-item">
          <span class="stat-title">Avg Spending</span>
          <span class="stat-num">${cluster.avg_spending} / 100</span>
        </div>
      </div>
    `;

    clusterCardsContainer.appendChild(card);
  });
}

/**
 * UI State Helpers: Loading, Error, Modals
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    btnSubmit.disabled = true;
    btnUseSample.disabled = true;
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    loadingSection.style.display = 'block';
  } else {
    btnSubmit.disabled = false;
    btnUseSample.disabled = false;
    if (btnSpinner) btnSpinner.style.display = 'none';
    loadingSection.style.display = 'none';
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.style.display = 'block';
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  errorBanner.style.display = 'none';
  errorMessage.textContent = '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Configure Modal for Draft Policies
 */
function setupModalHandlers() {
  privacyLink.addEventListener('click', () => {
    modalTitle.textContent = 'Privacy Policy (Draft)';
    modalBody.innerHTML = `
      <p><strong>1. Data Processing Notice</strong><br>This Customer Segmentation System processes uploaded CSV files in-memory for the sole purpose of executing K-Means statistical clustering and generating visualization charts.</p>
      <p><strong>2. Retention & Privacy</strong><br>Uploaded datasets are processed locally on your server and are not shared with external third parties or remote endpoints.</p>
      <p><strong>3. Hackathon Notice</strong><br>This software is provided as a demonstration prototype for evaluation and research purposes.</p>
    `;
    policyModal.showModal();
  });

  termsLink.addEventListener('click', () => {
    modalTitle.textContent = 'Terms of Service (Draft)';
    modalBody.innerHTML = `
      <p><strong>1. Acceptance of Terms</strong><br>By accessing and utilizing this Customer Segmentation tool, you agree to these demonstration terms.</p>
      <p><strong>2. Academic & Hackathon Use</strong><br>The clustering results and interpretations are statistical summaries intended for educational and analytical prototyping.</p>
      <p><strong>3. Disclaimer of Warranties</strong><br>The system is provided "as is" without warranty of commercial fitness or guarantee of financial outcomes.</p>
    `;
    policyModal.showModal();
  });

  modalCloseBtn.addEventListener('click', () => policyModal.close());
  modalOkBtn.addEventListener('click', () => policyModal.close());

  // Close on backdrop click
  policyModal.addEventListener('click', (e) => {
    const rect = policyModal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      policyModal.close();
    }
  });
}
