// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const chatArea = document.getElementById('chatArea');
const referencesPanel = document.getElementById('referencesPanel');
const referencesContent = document.getElementById('referencesContent');
const tokenCount = document.getElementById('tokenCount');
const stepCount = document.getElementById('stepCount');

// State
let currentRequestId = null;
let eventSource = null;
let isFirstMessage = true;
let currentStep = 0;

// Utility Functions
function createMessageElement(content, type = 'assistant') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Remove welcome message on first user input
    if (type === 'user' && isFirstMessage) {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        isFirstMessage = false;
    }
    
    // Add animation class for entry
    messageDiv.classList.add('message-enter');
    setTimeout(() => messageDiv.classList.remove('message-enter'), 300);
    
    messageDiv.innerHTML = content;
    return messageDiv;
}

function updateReferences(references = []) {
    // Show references panel on mobile when there are references
    if (window.innerWidth <= 768 && references.length > 0) {
        referencesPanel.classList.add('show');
    }

    if (references.length === 0) {
        referencesContent.innerHTML = '<div class="no-references">No references available yet.</div>';
        return;
    }
    
    referencesContent.innerHTML = references.map((ref, index) => `
        <div class="reference-item">
            <div class="reference-number">${index + 1}</div>
            <div class="reference-content">
                <a href="${ref.url}" target="_blank" rel="noopener noreferrer">
                    ${ref.title || ref.url}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                ${ref.snippet ? `<p class="reference-snippet">${ref.snippet}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function addThinkingMessage() {
    const thinkingDiv = createMessageElement(
        '<div class="thinking-content">' +
        '<p>Thinking<span class="dots">...</span></p>' +
        '<div class="thinking-indicator"></div>' +
        '</div>',
        'thinking'
    );
    thinkingDiv.id = 'thinking-message';
    chatArea.appendChild(thinkingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function removeThinkingMessage() {
    const thinkingMessage = document.getElementById('thinking-message');
    if (thinkingMessage) {
        thinkingMessage.classList.add('message-exit');
        setTimeout(() => thinkingMessage.remove(), 300);
    }
}

function updateStatus(tokens, step) {
    // Animate number changes
    animateNumber(tokenCount, parseInt(tokenCount.textContent), tokens, 1000);
    
    // Update step count with animation
    if (step !== undefined && step !== currentStep) {
        animateNumber(stepCount, currentStep, step, 300);
        currentStep = step;
    }
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const change = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const value = Math.floor(start + change * progress);
        element.textContent = value.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Event Source Handler
function setupEventSource(requestId) {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/api/v1/stream/${requestId}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'progress':
                if (data.trackers) {
                    // Update token usage and step
                    const tokenUsage = data.trackers.tokenUsage || 0;
                    const step = data.trackers.actionState?.step || data.step || 0;
                    updateStatus(tokenUsage, step);

                    // Update thinking message with current action
                    if (data.trackers.actionState?.action) {
                        const thinkingMessage = document.getElementById('thinking-message');
                        if (thinkingMessage) {
                            const content = `
                                <div class="thinking-content">
                                    <p>Step ${step}: ${data.trackers.actionState.action}</p>
                                    ${data.trackers.actionState.think ? 
                                        `<p class="think">${data.trackers.actionState.think}</p>` : 
                                        ''}
                                    <div class="thinking-indicator"></div>
                                </div>
                            `;
                            thinkingMessage.innerHTML = content;
                        }
                    }

                    // Handle search results from the current step
                    const currentStep = data.trackers.actionState;
                    if (currentStep) {
                        let references = [];
                        
                        // Handle search action
                        if (currentStep.action === 'search') {
                            if (currentStep.searchResults) {
                                references = currentStep.searchResults.map(result => ({
                                    url: result.url,
                                    title: result.title || result.url.split('/').pop() || result.url,
                                    snippet: result.snippet || result.content || 'No preview available'
                                }));
                                updateReferences(references);
                                console.log('Search results:', references);
                            }
                        }
                        
                        // Handle visit action with URLs
                        if (currentStep.action === 'visit' && currentStep.URLTargets) {
                            references = currentStep.URLTargets.map(url => ({
                                url: url,
                                title: url.split('/').pop() || url,
                                snippet: currentStep.content || 'Visiting webpage...'
                            }));
                            updateReferences(references);
                            console.log('Visit references:', references);
                        }

                        // Handle answer action with references
                        if (currentStep.action === 'answer' && currentStep.references) {
                            references = currentStep.references.map(ref => ({
                                url: ref.url,
                                title: ref.title || ref.url.split('/').pop() || ref.url,
                                snippet: ref.exactQuote || ref.snippet || ref.content || 'No content available'
                            }));
                            updateReferences(references);
                            console.log('Answer references:', references);
                        }
                    }
                }
                break;

            case 'answer':
                removeThinkingMessage();
                const messageDiv = createMessageElement(data.data.answer || 'No answer provided');
                chatArea.appendChild(messageDiv);
                
                // Update final references from the answer
                if (data.data.references) {
                    const formattedRefs = data.data.references.map(ref => ({
                        url: ref.url,
                        title: ref.url.split('/').pop() || ref.url,
                        snippet: ref.exactQuote
                    }));
                    updateReferences(formattedRefs);
                }
                
                eventSource.close();
                break;

            case 'error':
                removeThinkingMessage();
                const errorDiv = createMessageElement(
                    `<div class="error-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Error: ${data.data}</span>
                    </div>`,
                    'error'
                );
                chatArea.appendChild(errorDiv);
                eventSource.close();
                break;
        }
        
        chatArea.scrollTop = chatArea.scrollHeight;
    };

    eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        removeThinkingMessage();
        const errorDiv = createMessageElement(
            `<div class="error-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Connection lost. Please try again.</span>
            </div>`,
            'error'
        );
        chatArea.appendChild(errorDiv);
    };
}

// Form Submit Handler
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    
    if (!query) return;

    // Reset state for new query
    currentStep = 0;
    updateStatus(0, 0);
    updateReferences([]);

    // Add user message
    const userMessage = createMessageElement(query, 'user');
    chatArea.appendChild(userMessage);
    
    // Add thinking message
    addThinkingMessage();
    
    try {
        const response = await fetch('/api/v1/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                budget: 1000000,
                maxBadAttempt: 3
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        currentRequestId = data.requestId;
        setupEventSource(currentRequestId);
        
        // Clear input
        searchInput.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        removeThinkingMessage();
        const errorDiv = createMessageElement(
            `<div class="error-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Failed to send query. Please try again.</span>
            </div>`,
            'error'
        );
        chatArea.appendChild(errorDiv);
    }
}); 