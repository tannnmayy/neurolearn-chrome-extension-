Neuro-Reads – AI‑Powered Dyslexia Assistant for the Web
Neuro-Reads is a Chrome extension that makes web content more accessible and comfortable to read, especially for people with dyslexia and related reading difficulties. It combines classic visual accessibility features (font, size, background) with AI‑powered text simplification that runs seamlessly as you browse.

Features
AI Text Simplification

Uses a Hugging Face Qwen model (via the Hugging Face Inference Router) to rewrite complex text into clearer, easier language.
Only processes visible content in the viewport to avoid lag and unnecessary API usage.
Rewrites DOM text nodes in place, preserving layout and structure.
Visual Accessibility Controls

OpenDyslexic-style font: Improves character differentiation and reduces letter swapping.
Larger text: Increases font size for better legibility.
Cream background: Applies a warm background to reduce glare and visual stress.
All features are toggleable from the extension popup.
Smart, Non‑Intrusive Behavior

Uses IntersectionObserver to simplify content just before it scrolls into view.
Uses a DOM scanner and rewriter to carefully target textual content without breaking page functionality.
Tracks original text so it can be fully restored when simplification is turned off.
High‑Level Architecture
"Chrome Browser"
"Web Page Tab"
PREFERENCES_UPDATED
success + simplified
SIMPLIFY_TEXT
HTTP POST\nchat/completions
Simplified Text
"Hugging Face Router API\n(Qwen chat/completions)"
"Extension Popup UI"
"Background Service Worker"
"Web Page DOM"
"Content Script"
Component Overview
Popup UI

Reacts to user toggles: AI simplification, OpenDyslexic font, larger text, cream background.
Sends PREFERENCES_UPDATED messages to the background worker.
Background Service Worker (background/serviceWorker.js)

On first install, sets default preferences in chrome.storage.local.
Listens for:
PREFERENCES_UPDATED → forwards APPLY_PREFERENCES to the active tab.
SIMPLIFY_TEXT → performs the AI call.
Calls https://router.huggingface.co/v1/chat/completions with:
model: "Qwen/Qwen2.5-72B-Instruct"
messages: system + user prompt.
Parses both:
OpenAI-style responses: data.choices[0].message.content
HF-style array responses: data[0].generated_text
Returns { success, simplified } or { success: false, error } to the content script.
Content Script (content/content.js)

Runs on every eligible page.
Reads preferences from chrome.storage.local and applies:
Font, background, and text size via a style injector.
AI simplification start/stop via NeuroReadsTextSimplifier.
Listens for:
APPLY_PREFERENCES messages from background.
chrome.storage.onChanged to sync preferences across tabs.
Uses a MutationObserver to feed new elements into the simplification pipeline as pages dynamically change.
Text Simplifier (content/textSimplifier.js)

Keeps an IntersectionObserver to watch text‑heavy elements as they approach the viewport.
For each visible element:
Scans with NeuroReadsDomScanner to get text nodes and original text.
Filters out nodes not worth simplifying (too short, whitespace, etc.).
Concatenates text and chunks it via NeuroReadsTextProcessor.
For each chunk, calls NeuroReadsAI.simplifyText, which relays to the background.
Distributes the simplified text back across the original text nodes.
Uses NeuroReadsDomRewriter to batch‑replace DOM text nodes and track originals for undo.
Limits concurrent API calls to avoid UI jank and API overuse.
Shows a small loading indicator while AI requests are in flight.
AI Client (ai/aiClient.js)

Wraps chrome.runtime.sendMessage calls to the background with a simple simplifyText(text) Promise API.
Sends:
type: "SIMPLIFY_TEXT"
systemPrompt and userPrompt built from internal prompt templates.
Handles:
chrome.runtime.lastError (e.g., inactive service worker).
Failure responses from background (success: false).
Returns the simplified text or null on failure.
Data Flow: End‑to‑End Simplification
User enables AI simplification in the popup.
Popup sends PREFERENCES_UPDATED → background → APPLY_PREFERENCES → content script.
Content script calls NeuroReadsTextSimplifier.startSimplification().
Text Simplifier:
Observes relevant DOM elements as they scroll into view.
Extracts and chunks their text content.
Uses NeuroReadsAI.simplifyText(chunk) for each chunk.
AI Client sends SIMPLIFY_TEXT message to the background worker.
Background calls Hugging Face Router, parses the response, and returns simplified text.
Text Simplifier distributes and writes simplified text back into the DOM via the DOM rewriter.
When the user disables the feature, the content script calls restorePage(), restoring all original text.
Security & API Keys
API keys must not be committed.
background/serviceWorker.js ships with HF_API_KEY set to an empty string.
In your local/dev environment, set your Hugging Face token either:
Temporarily in code (do not commit), or
Via an options page and store it in chrome.storage.local, then read it before making API calls.
Development & Installation
Clone the repo.
Set your Hugging Face token locally (do not commit).
In Chrome:
Go to chrome://extensions.
Enable Developer mode.
Click Load unpacked and select the project folder.
Open any text‑heavy website and toggle the features from the extension popup.
