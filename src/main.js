import './style.css';

// DOM elements
const landingScreen = document.getElementById('landing-screen');
const uploadScreen = document.getElementById('upload-screen');
const newRequestBtn = document.getElementById('new-request-btn');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const chooseFileBtn = document.getElementById('choose-file-btn');
const submitBtn = document.getElementById('submit-btn');
const loading = document.getElementById('loading');
const statusMessage = document.getElementById('status-message');

// Status elements
const workflowStatus = document.getElementById('workflow-status');
const uploadStatus = document.getElementById('upload-status');
const submitStatus = document.getElementById('submit-status');
const completeStatus = document.getElementById('complete-status');

let selectedFile = null;
let resumeUrl = null;
let currentWorkflowId = null;

// N8N Webhook Configuration
const N8N_WEBHOOK_URL = 'https://john57845738478.app.n8n.cloud/webhook-test/87476124-4418-43c2-933d-24347b484016';

// Add webhook status logging
console.log('🔗 N8N Webhook URL configured:', N8N_WEBHOOK_URL);

// New Request button handling
newRequestBtn.addEventListener('click', async () => {
    // Update status immediately
    updateStatus('workflow', 'in-progress');
    
    try {
        // Import workflow function
        const { startWorkflow } = await import('./workflow.js');
        
        // Create initial workflow data (no file yet)
        const initialData = {
            action: 'new_request_started',
            workflowId: `claims_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            session: {
                sessionId: generateSessionId(),
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language
            },
            claimsData: {
                processType: 'invoice_claim',
                priority: 'normal',
                source: 'web_portal',
                version: '1.0',
                step: 'workflow_initiated'
            },
            context: {
                referrer: document.referrer || 'direct',
                pageUrl: window.location.href,
                screenResolution: `${screen.width}x${screen.height}`
            }
        };
        
        // Send initial data to webhook (without file)
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Workflow-Source': 'ai-claims-portal',
                'X-Request-ID': initialData.workflowId
            },
            body: JSON.stringify(initialData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        currentWorkflowId = initialData.workflowId;
        
        console.log('✅ Workflow started successfully:', {
            workflowId: currentWorkflowId,
            timestamp: initialData.session.timestamp,
            response: result
        });
        
        // Update status to complete for workflow started
        updateStatus('workflow', 'complete');
        
    } catch (error) {
        console.error('❌ Error starting workflow:', error);
        updateStatus('workflow', 'error');
        showStatus('Failed to start workflow. Please try again.', 'error');
        return;
    }
    
    // Show upload screen after successful webhook trigger
    landingScreen.style.display = 'none';
    uploadScreen.style.display = 'block';
});

// Helper function to generate unique session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// File upload handling
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

chooseFileBtn.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    document.querySelector('.upload-text').textContent = file.name;
    document.querySelector('.upload-subtext').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    submitBtn.disabled = false;
    
    // Update upload status
    updateStatus('upload', 'active');
}

// Submit button handling
submitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showStatus('Please select a file first', 'error');
        return;
    }

    showLoading(true);
    updateStatus('submit', 'in-progress');
    
    try {
        // Send file data to continue the workflow from the wait node
        const CONTINUE_WEBHOOK_URL = 'https://john57845738478.app.n8n.cloud/webhook-waiting/90';
        
        // Create FormData to send binary file + metadata
        const formData = new FormData();
        
        // Add the actual binary file
        formData.append('file', selectedFile);
        
        // Add comprehensive metadata as JSON
        const metadata = {
            // File information
            fileInfo: {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                fileSizeFormatted: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
                fileExtension: selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown'
            },
            
            // Session data
            session: {
                workflowId: currentWorkflowId,
                sessionId: generateSessionId(),
                timestamp: new Date().toISOString(),
                step: 'file_submission',
                resumeToken: currentWorkflowId // Add resume token for wait node
            },
            
            // Claims process data
            claimsData: {
                processType: 'invoice_claim',
                priority: 'normal',
                source: 'web_portal'
            }
        };
        
        // Add metadata as JSON string
        formData.append('metadata', JSON.stringify(metadata));
        
        console.log('🚀 Sending file to continue workflow at wait node:', CONTINUE_WEBHOOK_URL);
        
        const response = await fetch(CONTINUE_WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        
        console.log('✅ Wait node webhook triggered successfully:', {
            workflowId: currentWorkflowId,
            timestamp: new Date().toISOString(),
            webhookUrl: CONTINUE_WEBHOOK_URL,
            response: result
        });
        
        // Update status to complete
        updateStatus('submit', 'complete');
        updateStatus('complete', 'complete');
        
        showLoading(false);
        showStatus('File submitted successfully! Processing in progress...', 'success');
        
    } catch (error) {
        console.error('❌ Error submitting file to wait node:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to process request. Please try again.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error: Unable to connect to the processing server. Please check your internet connection and try again.';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Connection blocked: Please ensure the webhook is configured to accept requests from this domain.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = `Server error: ${error.message}`;
        }
        
        showStatus(errorMessage, 'error');
        updateStatus('submit', 'error');
        showLoading(false);
    }
});

function updateStatus(stage, status) {
    const statusMap = {
        'workflow': workflowStatus,
        'upload': uploadStatus,
        'submit': submitStatus,
        'complete': completeStatus
    };
    
    const element = statusMap[stage];
    if (element) {
        // Remove all status classes
        element.classList.remove('pending', 'active', 'in-progress', 'complete', 'error');
        // Add new status class
        element.classList.add(status);
    }
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    submitBtn.disabled = show || !selectedFile;
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}