/* --------------------------------------------------------------
   script.js – TinyLlama demo (browser-only)
   -------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DEBUG: 1. DOMContentLoaded handler started');

  // -----------------------------------------------------------------
  // 1️⃣  Simple compatibility check
  // -----------------------------------------------------------------
  function checkBrowserCompatibility() {
    const hasWebGPU = !!navigator.gpu;
    const hasWebGL = !!document.createElement('canvas').getContext('webgl2');
    console.log('Browser compatibility – WebGPU:', hasWebGPU, 'WebGL2:', hasWebGL);
    return true; // allow everything while debugging
  }

  // -----------------------------------------------------------------
  // 2️⃣  Simple chat-formatter
  // -----------------------------------------------------------------
  function formatChat(userInput) {
    return userInput;
  }

  // -----------------------------------------------------------------
  // 3️⃣  Fallback generateResponse (will be overwritten later)
  // -----------------------------------------------------------------
  window.generateResponse = async () => {
    const out = document.getElementById('output');
    if (out) {
      out.innerHTML = `<div style="color: var(--error);">
                         ❌ System initializing… Please wait.
                       </div>`;
    }
  };
  console.log('DEBUG: 4. INITIAL window.generateResponse defined');

  try {
    console.log('DEBUG: 5. Checking browser compatibility');
    if (!checkBrowserCompatibility()) {
      console.log('DEBUG: 6. Compatibility check failed – aborting');
      return;
    }
    console.log('DEBUG: 7. Compatibility check passed');

    // -----------------------------------------------------------------
    // 4️⃣  Grab DOM elements (null-safe)
    // -----------------------------------------------------------------
    const elements = {
      outputDiv:      document.getElementById('output'),
      chatHistory:    document.getElementById('chat-history'),
      inputEl:        document.getElementById('input'),
      generateBtn:    document.getElementById('generate'),
      cancelBtn:      document.getElementById('cancel'),
      clearBtn:       document.getElementById('clear'),
      maxTokensInput: document.getElementById('maxTokens')
    };

    const missing = Object.entries(elements)
      .filter(([_, el]) => !el)
      .map(([name]) => name);
    if (missing.length) {
      console.error('Missing DOM elements:', missing);
      elements.outputDiv?.innerHTML = `<div style="color: var(--error);">
          ❌ Critical error – missing elements: ${missing.join(', ')}
      </div>`;
      return;
    }
    console.log('DEBUG: 9. All critical DOM elements found');

    // -----------------------------------------------------------------
    // 5️⃣  State
    // -----------------------------------------------------------------
    let generator = null;
    let abortController = null;
    let isGenerating = false;

    // -----------------------------------------------------------------
    // 6️⃣  Add message bubble
    // -----------------------------------------------------------------
    function addMessage(role, content) {
      const msg = document.createElement('div');
      msg.className = `message ${role}-message`;
      const txt = document.createElement('div');
      txt.className = 'message-content';
      txt.textContent = content;
      msg.appendChild(txt);
      elements.chatHistory.appendChild(msg);
      elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
    }

    // -----------------------------------------------------------------
    // 7️⃣  Lazy model loader
    // -----------------------------------------------------------------
    async function initModel() {
      if (generator) return true;

      try {
        elements.outputDiv.innerHTML =
          '<div class="spinner"></div> Loading model…';

        const { pipeline } = await import(
          'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.0'
        );

        elements.outputDiv.innerHTML =
          '<div class="spinner"></div> Compiling model…';

        generator = await pipeline(
          'text2text-generation', // ✅ correct for BlenderBot
          'Xenova/blenderbot_small-90M',
          {
            progress_callback: p => {
              const pct = Math.round(p * 100);
              elements.outputDiv.innerHTML =
                `<div class="spinner"></div> Loading model: ${pct}%`;
            }
          }
        );

        elements.outputDiv.textContent = '✅ Model loaded! Ask away.';
        return true;
      } catch (e) {
        console.error('Model init error:', e);
        elements.outputDiv.innerHTML = `<div style="color: var(--error);">
            ❌ Error loading model: ${e.message || e}
        </div>`;
        return false;
      }
    }

    // -----------------------------------------------------------------
    // 8️⃣  Full generateResponse
    // -----------------------------------------------------------------
    window.generateResponse = async () => {
      console.log('DEBUG: 13. FULL generateResponse called');
      if (isGenerating) return;

      const userInput = elements.inputEl.value.trim();
      if (!userInput) {
        elements.outputDiv.textContent = 'Please enter a message first.';
        setTimeout(() => {
          elements.outputDiv.textContent = generator
            ? '✅ Model loaded! Ask away.'
            : '✅ Ready! Click “Generate” to load the model.';
        }, 2000);
        return;
      }

      // Add user message
      addMessage('user', userInput);
      elements.inputEl.value = '';

      // Add empty assistant bubble for streaming
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'message assistant-message';
      const assistantContent = document.createElement('div');
      assistantContent.className = 'message-content';
      assistantContent.textContent = '';
      assistantMsg.appendChild(assistantContent);
      elements.chatHistory.appendChild(assistantMsg);

      isGenerating = true;
      elements.cancelBtn.style.display = 'inline-flex';
      elements.generateBtn.disabled = true;
      elements.outputDiv.innerHTML =
        '<div class="spinner"></div> Generating response…';

      try {
        if (!await initModel()) return;

        abortController = new AbortController();
        const { signal } = abortController;

        const prompt = formatChat(userInput);
        const result = await generator(prompt, {
          max_new_tokens: parseInt(elements.maxTokensInput.value, 10),
          temperature: 0.7,
          repetition_penalty: 1.1,
          do_sample: true,
          signal,
          stream: true
        });

        let full = '';
        elements.outputDiv.textContent = '';
        for await (const upd of result) {
          const text = upd.generated_text; // cumulative
          full = text;
          elements.outputDiv.textContent = full;
          assistantContent.textContent = full;
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          elements.outputDiv.textContent += '\n\n[Generation cancelled]';
        } else {
          console.error('Generation error:', e);
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
          elements.outputDiv.textContent = '✅ Ready for next question!';
          setTimeout(() => {
            elements.outputDiv.textContent = generator
              ? '✅ Model loaded! Ask away.'
              : '✅ Ready! Click “Generate” to load the model.';
          }, 3000);
        }
      }
    };

    // -----------------------------------------------------------------
    // 9️⃣  Wire UI controls
    // -----------------------------------------------------------------
    elements.generateBtn.addEventListener('click', window.generateResponse);
    elements.cancelBtn.addEventListener('click', () => {
      if (abortController) abortController.abort();
    });
    elements.clearBtn.addEventListener('click', () => {
      elements.chatHistory.innerHTML = '';
      elements.outputDiv.textContent = generator
        ? '✅ Model loaded! Ask away.'
        : '✅ Ready! Click “Generate” to load the model.';
    });
    elements.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.generateResponse();
      }
    });

    // -----------------------------------------------------------------
    // 🔟 Final UI state
    // -----------------------------------------------------------------
    elements.outputDiv.textContent =
      '✅ System initialized. Click “Generate” to load the model.';
    console.log('DEBUG: 19. Initialization completed');
  } catch (e) {
    console.error('CRITICAL ERROR in initialization:', e);
    const out = document.getElementById('output');
    if (out) out.innerHTML = `<div style="color: var(--error);">
        ❌ Critical error: ${e.message}
    </div>`;
  }
});
