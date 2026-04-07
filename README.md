# NEURO-READS

A **Chrome extension (Manifest V3)** that helps people with dyslexia read the web more comfortably. It can simplify complex page text with AI, adjust typography and colors, and apply dyslexia-friendly fonts—**without** requiring a separate app or account for basic reading features.

---

## Features

| Feature | What it does |
|--------|----------------|
| **AI text simplification** | Rewrites visible article-style text into shorter, clearer sentences (via Hugging Face Inference API from the background worker). |
| **OpenDyslexic font** | Applies the bundled OpenDyslexic webfont to readable elements. |
| **Larger text** | Increases font size and spacing on common text containers. |
| **Cream background** | Soft cream page background with adjusted text and link colors. |

Preferences are saved in `chrome.storage.local` and sync across tabs when you change them.

---

## How it works

1. **Popup** (`popup/`) — Toggles for each feature; saves preferences and notifies the background script.
2. **Background service worker** (`background/serviceWorker.js`) — Relays preference updates to the active tab and performs **outbound AI requests** so page Content Security Policy does not block calls to the inference API.
3. **Content scripts** (`content/`) — On every page (`<all_urls>`), reads preferences, applies CSS injection, and when AI simplification is on:
   - Finds readable blocks (`p`, `li`, `article`, headings, table cells, etc.).
   - Uses an **IntersectionObserver** so only content near or in the viewport is processed (limits load and API usage).
   - Extracts text, chunks it, sends it to the background for simplification, then replaces **text nodes** in place so layout stays intact where possible.

Supporting modules: `utils/textProcessor.js` (chunking, light sanitization), `ai/aiClient.js` and `ai/promptTemplates.js` (prompts), `content/domScanner.js`, `content/domRewriter.js`, `content/styleInjector.js`.

---

## Requirements

- **Google Chrome** or **Microsoft Edge** (Chromium), with developer mode for unpacked extensions.
- For **AI simplification**: a valid **Hugging Face** API token with access to the configured chat model and permission to call `https://router.huggingface.co/`.

---

## Installation (development)

1. Clone or download this repository.
2. Open Chrome → **Extensions** → enable **Developer mode**.
3. Click **Load unpacked** and select the folder that contains `manifest.json` (the repo root).
4. Pin the NEURO-READS icon if you want quick access to the popup.

---

## Configuration (AI)

The background worker calls the Hugging Face **OpenAI-compatible** chat endpoint. The API key is **not** stored in the repo. Set it once in extension storage under the key `hfApiKey`:

1. Open `chrome://extensions`, find **NEURO-READS**, and click **Service worker** (or **Inspect views: service worker**) to open DevTools for the background script.
2. In the **Console**, run (replace with your real token):

   `chrome.storage.local.set({ hfApiKey: 'hf_...' })`

3. Reload the extension if simplification still fails.

**Security:** Never commit tokens to git. If a token was ever pushed, revoke it in your Hugging Face account and create a new one.

Default model in code: `Qwen/Qwen2.5-72B-Instruct` (adjust in `serviceWorker.js` if your account uses another model).

---

## Local testing without the real API

Open `test.html` in a browser from the project folder. It mocks `chrome.runtime.sendMessage` so you can exercise the DOM scanning and rewrite flow without a network call. Use the browser console to inspect logs.

---

## Project structure

```
neuroreads extension/
├── manifest.json
├── background/
│   └── serviceWorker.js      # Preferences relay + AI fetch
├── content/
│   ├── content.js            # Entry: prefs, mutation observer
│   ├── textSimplifier.js     # Viewport-based simplification
│   ├── domScanner.js         # Text node discovery
│   ├── domRewriter.js        # Replace / restore text nodes
│   └── styleInjector.js      # Font, background, size CSS
├── ai/
│   ├── aiClient.js           # Messages background for simplify
│   └── promptTemplates.js    # System / user prompts
├── utils/
│   └── textProcessor.js      # Chunking, filters, sanitize
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── assets/
│   ├── fonts/OpenDyslexic-Regular.woff2
│   └── icons/
└── test.html                 # Mock harness for local testing
```

---

## Privacy and security

- **AI simplification** sends visible page text excerpts to the inference provider you configure (Hugging Face). Do not use on pages with highly sensitive data unless you trust the provider and your key handling.
- The extension requests **`storage`**, **`activeTab`**, and host permission for **`https://router.huggingface.co/*`** only for the AI feature path.

---

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| AI does nothing | Confirm the toggle is on, check the extension service worker console and page console for errors, verify API key and model. |
| Some text unchanged | Very short strings or single words are skipped; off-screen blocks are processed when scrolled into view. |
| Layout looks odd | Simplification edits text nodes inside existing elements; complex pages with heavy scripts may still reflow. |

---

## Contributing

Issues and pull requests are welcome. When changing AI behavior, update `ai/promptTemplates.js` and test on a few real sites (news, Wikipedia, blogs).

---

## License

No license file is included in this repository yet. Add a `LICENSE` file when you publish or redistribute.
