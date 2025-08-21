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
            
            if (isGenerating) {
                console.log("DEBUG: 13.1. Generation is already in progress, returning early.");
                return;
            }
            
            const input = elements.inputEl.value.trim();
            if (!input) {
                console.log("DEBUG: 13.2. No input provided, displaying message.");
                elements.outputDiv.textContent = "Please enter a message first.";
                setTimeout(() => {
                    if (elements.outputDiv.textContent.includes("Please enter a message first.")) {
                        elements.outputDiv.textContent = generator ? "✅ Model loaded! Ask away." : "✅ Ready! Click 'Generate' to load the model.";
                    }
                }, 2000);
                return;
            }
            
            // Add user message to chat
            console.log("DEBUG: 13.3. Adding user message to chat.");
            addMessage('user', input);
            
            // Clear input
            console.log("DEBUG: 13.4. Clearing input field.");
            elements.inputEl.value = '';
            
            // Set generating state
            console.log("DEBUG: 13.5. Setting generating state.");
            isGenerating = true;
            elements.cancelBtn.style.display = 'inline-flex';
            elements.generateBtn.disabled = true;
            elements.outputDiv.innerHTML = '<div class="spinner"></div> Generating response...';
            
            try {
                // Initialize model if not already done
                console.log("DEBUG: 13.6. Initializing model if not already done.");
                if (!await initModel()) {
                    console.log("DEBUG: 13.7. Model initialization failed, resetting state.");
                    isGenerating = false;
                    elements.generateBtn.disabled = false;
                    elements.cancelBtn.style.display = 'none';
                    return;
                }
                
                // Prepare for cancellation
                console.log("DEBUG: 13.8. Preparing for cancellation.");
                abortController = new AbortController();
                const { signal } = abortController;
                
                // Format the input for the chat model
                console.log("DEBUG: 13.9. Formatting input for chat model.");
                const formattedInput = formatChat(input);
                
                // Generate response with streaming
                console.log("DEBUG: 13.10. Generating response with streaming.");
                const result = await generator(formattedInput, {
                    max_new_tokens: parseInt(elements.maxTokensInput.value),
                    temperature: 0.7,
                    repetition_penalty: 1.1,
                    do_sample: true,
                    signal,
                    stream: true
                });
                
                // Process streaming response
                console.log("DEBUG: 13.11. Processing streaming response.");
                let fullResponse = '';
                elements.outputDiv.textContent = '';
                
                for await (const update of result) {
                    const newToken = update.generated_text.slice(-1);
                    fullResponse += newToken;
                    
                    // Update output in real-time
                    console.log("DEBUG: 13.12. Updating output in real-time.");
                    elements.outputDiv.textContent = fullResponse;
                    
                    // Also update chat history in real-time
                    if (elements.chatHistory.lastChild) {
                        console.log("DEBUG: 13.13. Updating chat history in real-time.");
                        elements.chatHistory.lastChild.querySelector('.message-content').textContent = fullResponse;
                        elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
                    }
                }
                
                // Add to chat history
                console.log("DEBUG: 13.14. Adding assistant message to chat history.");
                addMessage('assistant', fullResponse);
                
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.log("DEBUG: 13.15. Generation cancelled.");
                    elements.outputDiv.textContent += "\n\n[Generation cancelled]";
                } else {
                    console.error("Generation error:", e);
                    console.log("DEBUG: 13.16. Error generating response.");
                    elements.outputDiv.innerHTML = `
                        <div style="color: var(--error);">
                            ❌ Error generating response: ${e.message || e}
                        </div>
                    `;
                }
            } finally {
                console.log("DEBUG: 13.17. Resetting generating state.");
                isGenerating = false;
                elements.generateBtn.disabled = false;
                elements.cancelBtn.style.display = 'none';
                abortController = null;
                
                // Reset to ready state if no error
                if (elements.outputDiv.textContent && !elements.outputDiv.textContent.includes('❌')) {
                    console.log("DEBUG: 13.18. Resetting to ready state.");
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
