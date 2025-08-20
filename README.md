# Browser based LLM

![GitHub repo size](https://img.shields.io/github/repo-size/harisnae/browser-based-LLM)
![GitHub top language](https://img.shields.io/github/languages/top/harisnae/browser-based-LLM)
![npm](https://img.shields.io/npm/v/@xenova/transformers)

A reference implementation for deploying ultra-lightweight open-source language models **entirely in the browser** with no server infrastructure required. This project demonstrates how to overcome browser constraints to deliver a functional LLM experience across all devices.

## Technical Implementation Details

### Core Technologies
- 🧠 **Model Framework**: [`@xenova/transformers@2.10.0`](https://www.npmjs.com/package/@xenova/transformers) - Browser-optimized fork of Hugging Face Transformers
- ⚙️ **Execution Engine**: WebAssembly (WASM) with SIMD support for tensor operations
- 📱 **Mobile Optimization**: Responsive design + memory constraints handling for mobile browsers
- ☁️ **Deployment**: Pure static files on GitHub Pages (zero backend)

### Key Technical Achievements
- **Complete Client-Side Execution**: All model loading, tokenization, and inference happens in-browser
- **Memory Management System**: 
  - Model unloading after 10 minutes of inactivity
  - Browser memory API monitoring
  - Progressive loading indicators
- **Mobile Browser Compatibility**:
  - Touch-friendly interface
  - Reduced memory footprint strategies
  - Network condition awareness
- **Streaming Response Handling**: Real-time token generation display
- **Cancellation Support**: AbortController integration for long-running generations

### Technical Constraints Addressed
| Challenge | Solution |
|-----------|----------|
| Large model size (~2GB) | Lazy loading (only on first interaction) |
| Browser memory limits | Active monitoring + model unloading |
| Mobile device limitations | Reduced token generation parameters |
| WebAssembly initialization | Progress callbacks + loading states |
| Network reliability | Browser caching strategies |

### Why This Implementation Matters
This project demonstrates that modern browsers can execute meaningful language models without server infrastructure, enabling:
- Privacy-preserving AI applications
- Offline-capable language tools
- Zero-cost deployment for educational demos
- Cross-platform compatibility (desktop/mobile)

The implementation specifically targets the technical challenges of browser-based LLMs rather than focusing on any particular model, making it a valuable reference for developers exploring this emerging space.
