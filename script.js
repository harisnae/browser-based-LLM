// Browser compatibility check - FIXED WITH DETAILED ERROR HANDLING
function checkBrowserCompatibility() {
    try {
        console.log("DEBUG: A. checkBrowserCompatibility function started");
        
        const outputDiv = document.getElementById("output");
        console.log("DEBUG: B. outputDiv element:", outputDiv ? "FOUND" : "NOT FOUND");
        
        // Check for WebAssembly support - MORE ROBUST
        console.log("DEBUG: C. Checking WebAssembly support");
        if (typeof WebAssembly === 'undefined' || !WebAssembly.validate) {
            console.error("DEBUG: D. WebAssembly is NOT supported by this browser");
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Your browser doesn't support WebAssembly, required for this demo.
                    </div>
                    <p>Please use a modern browser like Chrome, Firefox, Edge, or Safari.</p>
                `;
            }
            const generateBtn = document.getElementById("generate");
            console.log("DEBUG: E. generateBtn element:", generateBtn ? "FOUND" : "NOT FOUND");
            if (generateBtn) generateBtn.disabled = true;
            return false;
        }
        console.log("DEBUG: F. WebAssembly IS supported by this browser");
        
        // Check for proper SIMD support - MORE ROBUST
        console.log("DEBUG: G. Checking WebAssembly SIMD support");
        try {
            const wasmBytes = new Uint8Array([
                0, 0x61, 0x73, 0x6d,  // \0asm
                1, 0, 0, 0             // version 1
            ]);
            
            if (typeof WebAssembly.validate === 'function' && WebAssembly.validate(wasmBytes)) {
                new WebAssembly.Module(wasmBytes);
                console.log("DEBUG: H. Full WebAssembly SIMD support confirmed");
            } else {
                console.warn("DEBUG: I. Browser lacks full WebAssembly SIMD support, performance may be suboptimal");
            }
        } catch (e) {
            console.warn("DEBUG: J. WebAssembly basic validation failed:", e);
        }
        
        // Check for sufficient memory - MORE ROBUST
        console.log("DEBUG: K. Checking device memory");
        try {
            if (typeof navigator.deviceMemory === 'number') {
                console.log(`DEBUG: L. Device memory detected: ${navigator.deviceMemory}GB`);
                if (navigator.deviceMemory < 4) {
                    console.warn(`DEBUG: M. Low memory device detected (${navigator.deviceMemory}GB). Performance may be poor.`);
                    if (outputDiv) {
                        outputDiv.innerHTML = `
                            <div style="color: var(--warning);">
                                ⚠️ Low memory device detected. The model requires approximately 2GB of RAM.
                            </div>
                            <p>Performance may be slow or unstable on this device.</p>
                        `;
                    }
                }
            } else {
                console.log("DEBUG: N. navigator.deviceMemory not available in this browser");
            }
        } catch (e) {
            console.warn("DEBUG: O. Error checking device memory:", e);
        }
        
        console.log("DEBUG: P. Browser compatibility check completed successfully");
        return true;
    } catch (e) {
        console.error("CRITICAL ERROR in checkBrowserCompatibility:", e);
        try {
            const outputDiv = document.getElementById("output");
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Critical browser check error: ${e.message}
                    </div>
                `;
            }
        } catch (innerError) {
            console.error("Could not display browser check error:", innerError);
        }
        return false;
    }
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

// Main application - FIXED WITH EARLY FUNCTION DEFINITION
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DEBUG: 1. DOMContentLoaded handler started");
    
    // CRITICAL FIX #1: Define generateResponse IMMEDIATELY with fallback
    window.generateResponse = async function() {
        console.log("DEBUG: 2. FALLBACK generateResponse called - system still initializing");
        const outputDiv = document.getElementById("output");
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div style="color: var(--error);">
                    ❌ System initializing... Please wait a moment.
                </div>
            `;
        }
        console.log("DEBUG: 3. FALLBACK generateResponse execution completed");
    };
    
    console.log("DEBUG: 4. INITIAL window.generateResponse defined");
    
    try {
        console.log("DEBUG: 5. Checking browser compatibility");
        if (!checkBrowserCompatibility()) {
            console.log("DEBUG: 6. Browser compatibility check failed - exiting");
            return;
        }
        console.log("DEBUG: 7. Browser compatibility check passed");
        
        // DOM elements with null safety
        console.log("DEBUG: 8. Getting DOM elements");
        const elements = {
            outputDiv: document.getElementById("output"),
            chatHistory: document.getElementById("chat-history"),
            inputEl: document.getElementById("input"),
            generateBtn: document.getElementById("generate"),
            cancelBtn: document.getElementById("cancel"),
            clearBtn: document.getElementById("clear"),
            maxTokensInput: document.getElementById("maxTokens")
        };
        
        // Verify all critical elements exist
        const missingElements = Object.entries(elements)
            .filter(([_, el]) => !el)
            .map(([name]) => name);
            
        if (missingElements.length > 0) {
            console.error("DEBUG: CRITICAL - Missing DOM elements:", missingElements);
            if (elements.outputDiv) {
                elements.outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Critical error: Missing DOM elements - ${missingElements.join(', ')}
                    </div>
                `;
            }
            return;
        }
        console.log("DEBUG: 9. All critical DOM elements found");
        
        // State variables
        let generator = null;
        let abortController = null;
        let lastInteraction = Date.now();
        let isGenerating = false;
        
        console.log("DEBUG: 10. State variables initialized");
        
        // Update last interaction time on any user action
        document.addEventListener('click', () => lastInteraction = Date.now());
        document.addEventListener('keydown', () => lastInteraction = Date.now());
        
        console.log("DEBUG: 11. Interaction tracking setup complete");
        
        // Add message to chat history
        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}-message`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            elements.chatHistory.appendChild(messageDiv);
            
            // Scroll to bottom
            elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
        }
        
        // Initialize model (lazy-loaded)
        async function initModel() {
            if (generator) return true;
            
            try {
                elements.outputDiv.innerHTML = '<div class="spinner"></div> Loading model... This may take 30-60 seconds on first load.';
                
                // Dynamically import only when needed
                const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.0");
                
                elements.outputDiv.innerHTML = '<div class="spinner"></div> Compiling model...';
                
                generator = await pipeline(
                    "text-generation",
                    "Xenova/blenderbot_small-90M",
                    {
                        progress_callback: (progress) => {
                            const percent = Math.round(progress * 100);
                            elements.outputDiv.innerHTML = `<div class="spinner"></div> Loading model: ${percent}%`;
                        }
                    }
                );
                
                elements.outputDiv.textContent = "✅ Model loaded! Ask away.";
                return true;
            } catch (e) {
                console.error("Model initialization error:", e);
                elements.outputDiv.innerHTML = `
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
        
        // CRITICAL FIX #2: Redefine generateResponse with full implementation
        console.log("DEBUG: 12. Redefining window.generateResponse with full implementation");
        
        window.generateResponse = async function() {
            console.log("DEBUG: 13. FULL generateResponse function called successfully!");
            
            if (isGenerating) return;
            
            const input = elements.inputEl.value.trim();
            if (!input) {
                elements.outputDiv.textContent = "Please enter a message first.";
                setTimeout(() => {
                    if (elements.outputDiv.textContent.includes("Please enter a message first.")) {
                        elements.outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
                    }
                }, 2000);
                return;
            }
            
            // Add user message to chat
            addMessage('user', input);
            
            // Clear input
            elements.inputEl.value = '';
            
            // Set generating state
            isGenerating = true;
            elements.cancelBtn.style.display = 'inline-flex';
            elements.generateBtn.disabled = true;
            elements.outputDiv.innerHTML = '<div class="spinner"></div> Generating response...';
            
            try {
                // Initialize model if not already done
                if (!await initModel()) {
                    isGenerating = false;
                    elements.generateBtn.disabled = false;
                    elements.cancelBtn.style.display = 'none';
                    return;
                }
                
                // Prepare for cancellation
                abortController = new AbortController();
                const { signal } = abortController;
                
                // Format the input for the chat model
                const formattedInput = formatChat(input);
                
                // Generate response with streaming
                const result = await generator(formattedInput, {
                    max_new_tokens: parseInt(elements.maxTokensInput.value),
                    temperature: 0.7,
                    repetition_penalty: 1.1,
                    do_sample: true,
                    signal,
                    stream: true
                });
                
                // Process streaming response
                let fullResponse = '';
                elements.outputDiv.textContent = '';
                
                for await (const update of result) {
                    const newToken = update.generated_text.slice(-1);
                    fullResponse += newToken;
                    
                    // Update output in real-time
                    elements.outputDiv.textContent = fullResponse;
                    
                    // Also update chat history in real-time
                    if (elements.chatHistory.lastChild) {
                        elements.chatHistory.lastChild.querySelector('.message-content').textContent = fullResponse;
                        elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
                    }
                }
                
                // Add to chat history
                addMessage('assistant', fullResponse);
                
            } catch (e) {
                if (e.name === 'AbortError') {
                    elements.outputDiv.textContent += "\n\n[Generation cancelled]";
                } else {
                    console.error("Generation error:", e);
                    elements.outputDiv.innerHTML = `
                        <div style="color: var(--error);">
                            ❌ Error generating response: ${e.message || e}
                        </div>
                    `;
                }
            } finally {
                isGenerating = false;
                elements.generateBtn.disabled = false;
                elements.cancelBtn.style.display = 'none';
                abortController = null;
                
                // Reset to ready state if no error
                if (elements.outputDiv.textContent && !elements.outputDiv.textContent.includes('❌')) {
                    elements.outputDiv.textContent = "✅ Ready for next question!";
                    setTimeout(() => {
                        if (elements.outputDiv.textContent === "✅ Ready for next question!") {
                            elements.outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
                        }
                    }, 3000);
                }
            }
        };
        
        console.log("DEBUG: 14. window.generateResponse redefined with full implementation");
        
        // Cancel generation
        function cancelGeneration() {
            if (abortController) {
                abortController.abort();
                elements.outputDiv.textContent += "\n\n[Cancelled]";
            }
        }
        
        // Clear chat
        function clearChat() {
            elements.chatHistory.innerHTML = '';
            elements.outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
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
                    elements.outputDiv.textContent = "Model unloaded to save memory. Click 'Generate' to reload.";
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
                        elements.outputDiv.textContent = "Memory pressure detected. Model unloaded. Click 'Generate' to reload.";
                    }
                }, 30000); // Check every 30 seconds
            }
        }
        
        // CRITICAL FIX #3: Ensure proper button event attachment
        console.log("DEBUG: 15. Setting up button event handlers");
        
        // First, verify the generate button exists
        if (!elements.generateBtn) {
            console.error("DEBUG: CRITICAL - Generate button not found in DOM!");
            if (elements.outputDiv) {
                elements.outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Critical error: Generate button not found
                    </div>
                `;
            }
            return;
        }
        
        // Directly attach the event listener without button replacement
        console.log("DEBUG: 16. Attaching click listener directly to generate button");
        elements.generateBtn.addEventListener('click', window.generateResponse);
        
        // Verify the event listener is attached
        console.log("DEBUG: 17. Testing if event listener is attached");
        const testEvent = new Event('click', { bubbles: true });
        elements.generateBtn.dispatchEvent(testEvent);
        console.log("DEBUG: 18. Test click event dispatched to verify listener");
        
        // Event listeners for other buttons
        elements.cancelBtn.addEventListener('click', cancelGeneration);
        elements.clearBtn.addEventListener('click', clearChat);
        
        // Allow Enter to submit (but Shift+Enter for new line)
        elements.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.generateResponse();
            }
        });
        
        // Initialize memory monitoring
        setupMemoryMonitoring();
        
        // Focus input on load
        setTimeout(() => elements.inputEl.focus(), 500);
        
        console.log("DEBUG: 19. Initialization completed successfully!");
        if (elements.outputDiv) {
            elements.outputDiv.textContent = "✅ System initialized. Click 'Generate' to load the model.";
        }
        
    } catch (e) {
        console.error("CRITICAL ERROR in initialization:", e);
        try {
            const outputDiv = document.getElementById("output");
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div style="color: var(--error);">
                        ❌ Critical error: ${e.message}
                    </div>
                    <p>Check browser console for technical details.</p>
                `;
            }
        } catch (innerError) {
            console.error("Could not display error message:", innerError);
        }
    }
});
