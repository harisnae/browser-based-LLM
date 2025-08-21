document.addEventListener('DOMContentLoaded', async () => {
    console.log("DEBUG: 1. DOMContentLoaded handler started");

    // -----------------------------------------------------------------
    // 1️⃣  Helper that was missing
    // -----------------------------------------------------------------
    function checkBrowserCompatibility() {
        // Simple check – you can expand later
        const hasWebGPU = !!navigator.gpu;
        const hasWebGL = !!document.createElement('canvas').getContext('webgl2');
        console.log('Browser compatibility – WebGPU:', hasWebGPU, 'WebGL2:', hasWebGL);
        return true; // always allow for now
    }

    // -----------------------------------------------------------------
    // 2️⃣  Helper that was missing
    // -----------------------------------------------------------------
    function formatChat(userInput) {
        // For the BlenderBot‑small model a plain string works.
        // Adjust if you need a more elaborate prompt format.
        return userInput;
    }

    // -----------------------------------------------------------------
    // 3️⃣  Fallback generateResponse (kept for safety)
    // -----------------------------------------------------------------
    window.generateResponse = async function () {
        const outputDiv = document.getElementById("output");
        if (outputDiv) {
            outputDiv.innerHTML = `<div style="color: var(--error);">❌ System initializing… Please wait.</div>`;
        }
    };
    console.log("DEBUG: 4. INITIAL window.generateResponse defined");

    try {
        console.log("DEBUG: 5. Checking browser compatibility");
        if (!checkBrowserCompatibility()) {
            console.log("DEBUG: 6. Browser compatibility check failed - exiting");
            return;
        }
        console.log("DEBUG: 7. Browser compatibility check passed");

        // -----------------------------------------------------------------
        // 4️⃣  Grab DOM elements (null‑safe)
        // -----------------------------------------------------------------
        const elements = {
            outputDiv: document.getElementById("output"),
            chatHistory: document.getElementById("chat-history"),
            inputEl: document.getElementById("input"),
            generateBtn: document.getElementById("generate"),
            cancelBtn: document.getElementById("cancel"),
            clearBtn: document.getElementById("clear"),
            maxTokensInput: document.getElementById("maxTokens")
        };

        // Verify critical elements
        const missing = Object.entries(elements)
            .filter(([_, el]) => !el)
            .map(([name]) => name);
        if (missing.length) {
            console.error("Missing DOM elements:", missing);
            elements.outputDiv?.innerHTML = `<div style="color: var(--error);">
                ❌ Critical error: Missing DOM elements – ${missing.join(', ')}
            </div>`;
            return;
        }
        console.log("DEBUG: 9. All critical DOM elements found");

        // -----------------------------------------------------------------
        // 5️⃣  State variables
        // -----------------------------------------------------------------
        let generator = null;
        let abortController = null;
        let isGenerating = false;

        // -----------------------------------------------------------------
        // 6️⃣  UI helpers
        // -----------------------------------------------------------------
        function addMessage(role, content) {
            const msg = document.createElement('div');
            msg.className = `message ${role}-message`;
            const cnt = document.createElement('div');
            cnt.className = 'message-content';
            cnt.textContent = content;
            msg.appendChild(cnt);
            elements.chatHistory.appendChild(msg);
            elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
        }

        // -----------------------------------------------------------------
        // 7️⃣  Model loader (lazy)
        // -----------------------------------------------------------------
        async function initModel() {
            if (generator) return true;
            try {
                elements.outputDiv.innerHTML = '<div class="spinner"></div> Loading model…';
                const { pipeline } = await import(
                    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.0"
                );
                elements.outputDiv.innerHTML = '<div class="spinner"></div> Compiling model…';
                generator = await pipeline(
                    "text-generation",
                    "ova/blenderbot_small-90M",
                    {
                        progress_callback: p => {
                            const pct = Math.round(p * 100);
                            elements.outputDiv.innerHTML = `<div class="spinner"></div> Loading model: ${pct}%`;
                        }
                    }
                );
                elements.outputDiv.textContent = "✅ Model loaded! Ask away.";
                return true;
            } catch (e) {
                console.error("Model init error:", e);
                elements.outputDiv.innerHTML = `<div style="color: var(--error);">
                    ❌ Error loading model: ${e.message || e}
                </div>`;
                return false;
            }
        }

        // -----------------------------------------------------------------
        // 8️⃣  Full generateResponse implementation
        // -----------------------------------------------------------------
        window.generateResponse = async function () {
            console.log("DEBUG: 13. FULL generateResponse called");
            if (isGenerating) return;

            const input = elements.inputEl.value.trim();
            if (!input) {
                elements.outputDiv.textContent = "Please enter a message first.";
                setTimeout(() => {
                    elements.outputDiv.textContent = generator
                        ? "✅ Model loaded! Ask away."
                        : "✅ Ready! Click 'Generate' to load the model.";
                }, 2000);
                return;
            }

            addMessage('user', input);
            elements.inputEl.value = '';
            isGenerating = true;
            elements.cancelBtn.style.display = 'inline-flex';
            elements.generateBtn.disabled = true;
            elements.outputDiv.innerHTML = '<div class="spinner"></div> Generating response…';

            try {
                if (!await initModel()) return;

                abortController = new AbortController();
                const { signal } = abortController;

                const formatted = formatChat(input);
                const result = await generator(formatted, {
                    max_new_tokens: parseInt(elements.maxTokensInput.value),
                    temperature: 0.7,
                    repetition_penalty: 1.1,
                    do_sample: true,
                    signal,
                    stream: true
                });

                let full = '';
                elements.outputDiv.textContent = '';
                for await (const upd of result) {
                    const newTok = upd.generated_text.slice(-1);
                    full += newTok;
                    elements.outputDiv.textContent = full;
                    // update last chat bubble in real‑time
                    const lastBubble = elements.chatHistory.lastChild?.querySelector('.message-content');
                    if (lastBubble) lastBubble.textContent = full;
                }
                addMessage('assistant', full);
            } catch (e) {
                if (e.name === 'AbortError') {
                    elements.outputDiv.textContent += "\n\n[Generation cancelled]";
                } else {
                    console.error("Generation error:", e);
                    elements.outputDiv.innerHTML = `<div style="color: var(--error);">
                        ❌ Error generating response: ${e.message || e}
                    </div>`;
                }
            } finally {
                isGenerating = false;
                elements.generateBtn.disabled = false;
                elements.cancelBtn.style.display = 'none';
                abortController = null;
                if (!elements.outputDiv.textContent.includes('❌')) {
                    elements.outputDiv.textContent = "✅ Ready for next question!";
                    setTimeout(() => {
                        elements.outputDiv.textContent = generator
                            ? "✅ Model loaded! Ask away."
                            : "✅ Ready! Click 'Generate' to load the model.";
                    }, 3000);
                }
            }
        };

        // -----------------------------------------------------------------
        // 9️⃣  Wire the UI
        // -----------------------------------------------------------------
        elements.generateBtn.addEventListener('click', window.generateResponse);
        elements.cancelBtn.addEventListener('click', () => {
            if (abortController) abortController.abort();
        });
        elements.clearBtn.addEventListener('click', () => {
            elements.chatHistory.innerHTML = '';
            elements.outputDiv.textContent = generator
                ? "✅ Model loaded! Ask away."
                : "✅ Ready! Click 'Generate' to load the model.";
        });
        elements.inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.generateResponse();
            }
        });

        // -----------------------------------------------------------------
        // 10️⃣  Final UI state
        // -----------------------------------------------------------------
        elements.outputDiv.textContent = "✅ System initialized. Click 'Generate' to load the model.";
        console.log("DEBUG: 19. Initialization completed");
    } catch (e) {
        console.error("CRITICAL ERROR in initialization:", e);
        const out = document.getElementById("output");
        if (out) out.innerHTML = `<div style="color: var(--error);">
            ❌ Critical error: ${e.message}
        </div>`;
    }
});
