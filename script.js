// Browser compatibility check
function checkBrowserCompatibility() {
    const outputDiv = document.getElementById("output");
    
    // Check for WebAssembly support
    if (!window.WebAssembly) {
        outputDiv.innerHTML = `
            <div style="color: var(--error);">
                ❌ Your browser doesn't support WebAssembly, required for this demo.
            </div>
            <p>Please use a modern browser like Chrome, Firefox, Edge, or Safari.</p>
        `;
        document.getElementById("generate").disabled = true;
        return false;
    }
    
    // Check for proper SIMD support (improves performance)
    try {
        new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    } catch (e) {
        console.warn("Browser lacks full WebAssembly SIMD support, performance may be suboptimal");
    }
    
    // Check for sufficient memory (heuristic)
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
        console.warn(`Low memory device detected (${navigator.deviceMemory}GB). Performance may be poor.`);
        outputDiv.innerHTML = `
            <div style="color: var(--warning);">
                ⚠️ Low memory device detected. The model requires approximately 2GB of RAM.
            </div>
            <p>Performance may be slow or unstable on this device.</p>
        `;
    }
    
    return true;
}

// Format chat for Blenderbot
function formatChat(input) {
    return `<|system|>
You are a helpful AI assistant. Keep responses concise and helpful.</s>
<|user|>
${input}</s>
<|assistant|>
`;
}

// Main application
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkBrowserCompatibility()) return;
    
    // DOM elements
    const outputDiv = document.getElementById("output");
    const chatHistory = document.getElementById("chat-history");
    const inputEl = document.getElementById("input");
    const generateBtn = document.getElementById("generate");
    const cancelBtn = document.getElementById("cancel");
    const clearBtn = document.getElementById("clear");
    const maxTokensInput = document.getElementById("maxTokens");
    
    // State variables
    let generator = null;
    let abortController = null;
    let lastInteraction = Date.now();
    let isGenerating = false;
    
    // Update last interaction time on any user action
    document.addEventListener('click', () => lastInteraction = Date.now());
    document.addEventListener('keydown', () => lastInteraction = Date.now());
    
    // Add message to chat history
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // Initialize model (lazy-loaded)
    async function initModel() {
        if (generator) return true;
        
        try {
            outputDiv.innerHTML = '<div class="spinner"></div> Loading model... This may take 30-60 seconds on first load.';
            
            // Dynamically import only when needed
            const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.0");
            
            outputDiv.innerHTML = '<div class="spinner"></div> Compiling model...';
            
            generator = await pipeline(
                "text-generation",
                "Xenova/blenderbot_small-90M",
                {
                    progress_callback: (progress) => {
                        const percent = Math.round(progress * 100);
                        outputDiv.innerHTML = `<div class="spinner"></div> Loading model: ${percent}%`;
                    }
                }
            );
            
            outputDiv.textContent = "✅ Model loaded! Ask away.";
            return true;
        } catch (e) {
            console.error("Model initialization error:", e);
            outputDiv.innerHTML = `
                <div style="color: var(--error);">
                    ❌ Error loading model: ${e.message || e}
                </div>
                <p>Troubleshooting tips:</p>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Ensure you're using a modern browser</li>
                    <li>Clear browser cache if problem persists</li>
                </ul>
            `;
            return false;
        }
    }
    
    // Generate response
    async function generateResponse() {
        if (isGenerating) return;
        
        const input = inputEl.value.trim();
        if (!input) {
            outputDiv.textContent = "Please enter a message first.";
            setTimeout(() => {
                if (outputDiv.textContent.includes("Please enter a message first.")) {
                    outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
                }
            }, 2000);
            return;
        }
        
        // Add user message to chat
        addMessage('user', input);
        
        // Clear input
        inputEl.value = '';
        
        // Set generating state
        isGenerating = true;
        cancelBtn.style.display = 'inline-flex';
        generateBtn.disabled = true;
        outputDiv.innerHTML = '<div class="spinner"></div> Generating response...';
        
        try {
            // Initialize model if not already done
            if (!await initModel()) {
                isGenerating = false;
                generateBtn.disabled = false;
                cancelBtn.style.display = 'none';
                return;
            }
            
            // Prepare for cancellation
            abortController = new AbortController();
            const { signal } = abortController;
            
            // Format the input for the chat model
            const formattedInput = formatChat(input);
            
            // Generate response with streaming
            const result = await generator(formattedInput, {
                max_new_tokens: parseInt(maxTokensInput.value),
                temperature: 0.7,
                repetition_penalty: 1.1,
                do_sample: true,
                signal,
                stream: true
            });
            
            // Process streaming response
            let fullResponse = '';
            outputDiv.textContent = '';
            
            for await (const update of result) {
                const newToken = update.generated_text.slice(-1);
                fullResponse += newToken;
                
                // Update output in real-time
                outputDiv.textContent = fullResponse;
                
                // Also update chat history in real-time
                if (chatHistory.lastChild) {
                    chatHistory.lastChild.querySelector('.message-content').textContent = fullResponse;
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }
            }
            
            // Add to chat history
            addMessage('assistant', fullResponse);
            
        } catch (e) {
            if (e.name === 'AbortError') {
                outputDiv.textContent += "\n\n[Generation cancelled]";
            } else {
                console.error("Generation error:", e);
                outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Error generating response: ${e.message || e}
                    </div>
                `;
            }
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            cancelBtn.style.display = 'none';
            abortController = null;
            
            // Reset to ready state if no error
            if (outputDiv.textContent && !outputDiv.textContent.includes('❌')) {
                outputDiv.textContent = "✅ Ready for next question!";
                setTimeout(() => {
                    if (outputDiv.textContent === "✅ Ready for next question!") {
                        outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
                    }
                }, 3000);
            }
        }
    }
    
    // Cancel generation
    function cancelGeneration() {
        if (abortController) {
            abortController.abort();
            outputDiv.textContent += "\n\n[Cancelled]";
        }
    }
    
    // Clear chat
    function clearChat() {
        chatHistory.innerHTML = '';
        outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
    }
    
    // Memory management
    function setupMemoryMonitoring() {
        // Check memory usage periodically
        setInterval(() => {
            lastInteraction = Date.now();
            
            // If model is loaded but no interaction for 10 minutes, consider unloading
            if (generator && (Date.now() - lastInteraction > 600000)) { // 10 minutes
                console.log("No interaction for 10 minutes, unloading model to free memory");
                generator = null;
                outputDiv.textContent = "Model unloaded to save memory. Click 'Generate' to reload.";
            }
        }, 60000); // Check every minute
        
        // Browser memory API check
        if ('memory' in performance) {
            setInterval(() => {
                const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
                const usage = usedJSHeapSize / jsHeapSizeLimit;
                
                if (usage > 0.9 && generator) {
                    console.warn(`Memory usage high (${(usage * 100).toFixed(1)}%), unloading model`);
                    generator = null;
                    outputDiv.textContent = "Memory pressure detected. Model unloaded. Click 'Generate' to reload.";
                }
            }, 30000); // Check every 30 seconds
        }
    }
    
    // Event listeners
    generateBtn.addEventListener('click', generateResponse);
    cancelBtn.addEventListener('click', cancelGeneration);
    clearBtn.addEventListener('click', clearChat);
    
    // Allow Enter to submit (but Shift+Enter for new line)
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateResponse();
        }
    });
    
    // Initialize memory monitoring
    setupMemoryMonitoring();
    
    // Focus input on load
    setTimeout(() => inputEl.focus(), 500);
});
