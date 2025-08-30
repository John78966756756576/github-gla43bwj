// Workflow management functions

export async function startWorkflow(fileInfo, additionalData = {}) {
    const N8N_WEBHOOK_URL = 'https://john57845738478.app.n8n.cloud/webhook-test/87476124-4418-43c2-933d-24347b484016';
    
    // Create FormData to send binary file + metadata
    const formData = new FormData();
    
    // Add the actual binary file
    formData.append('file', fileInfo.file);
    
    // Add comprehensive metadata as JSON
    const metadata = {
        // Workflow identification
        action: 'start_claims_process',
        workflowId: `claims_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        
        // File information
        fileInfo: {
            fileName: fileInfo.fileName,
            fileSize: fileInfo.fileSize,
            fileType: fileInfo.fileType,
            fileSizeFormatted: `${(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB`,
            fileExtension: fileInfo.fileName.split('.').pop()?.toLowerCase() || 'unknown'
        },
        
        // Session and user data
        session: {
            sessionId: generateSessionId(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
        },
        
        // Claims process metadata
        claimsData: {
            processType: 'invoice_claim',
            priority: 'normal',
            source: 'web_portal',
            version: '1.0',
            expectedSteps: ['file_upload', 'document_analysis', 'claim_processing', 'completion']
        },
        
        // Additional context
        context: {
            referrer: document.referrer || 'direct',
            pageUrl: window.location.href,
            screenResolution: `${screen.width}x${screen.height}`,
            ...additionalData
        }
    };
    
    // Add metadata as JSON string
    formData.append('metadata', JSON.stringify(metadata));
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'X-Workflow-Source': 'ai-claims-portal',
                'X-Request-ID': metadata.workflowId
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Log successful webhook trigger
        console.log('✅ N8N Webhook triggered successfully:', {
            workflowId: metadata.workflowId,
            timestamp: metadata.session.timestamp,
            webhookUrl: N8N_WEBHOOK_URL,
            response: result
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error triggering n8n webhook:', error);
        throw error;
    }
}

// Helper function to generate unique session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}