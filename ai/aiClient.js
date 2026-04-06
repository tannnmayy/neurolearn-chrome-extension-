/**
 * NEURO-READS — AI Client
 * 
 * Handles communication with the background service worker
 * for text simplification, adding retry logic and validation.
 */

// eslint-disable-next-line no-var
var NeuroReadsAI = (() => {
  'use strict';

  const MAX_RETRIES = 2;

  /**
   * Internal function to handle a single API call over message passing.
   */
  async function _callBackground(text, previousContext) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'SIMPLIFY_TEXT',
        systemPrompt: NeuroReadsPrompts.SYSTEM_PROMPT,
        userPrompt: NeuroReadsPrompts.buildUserPrompt(text, previousContext)
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[NEURO-READS AI] Extension message failed:', chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (!response || !response.success) {
          console.error('[NEURO-READS AI] Simplification API failed:', response?.error || 'Unknown error');
          resolve(null);
          return;
        }
        resolve(response.simplified);
      });
    });
  }

  /**
   * Send text to the background script for AI simplification.
   * Includes validation and retries.
   * @param {string} text — The text to simplify.
   * @param {string} previousContext — Optional preceding text for continuity.
   * @returns {Promise<string|null>} — The simplified text, or null on failure.
   */
  async function simplifyText(text, previousContext = null) {
    console.log('[NEURO-READS AI] Starting simplification.', {
      length: text?.length || 0,
      preview: (text || '').slice(0, 120),
      hasContext: !!previousContext
    });

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      const result = await _callBackground(text, previousContext);
      
      if (!result) {
        console.warn(`[NEURO-READS AI] Attempt ${attempt} failed (Network/API Error).`);
        continue;
      }

      const sanitized = NeuroReadsTextProcessor.sanitize(result);
      if (NeuroReadsTextProcessor.isValidOutput(text, sanitized)) {
        console.log(`[NEURO-READS AI] Output valid on attempt ${attempt}.`);
        return sanitized;
      } else {
        console.warn(`[NEURO-READS AI] Attempt ${attempt} failed validation (Conversational/Truncated artifact):`, sanitized);
      }
    }

    console.error(`[NEURO-READS AI] Completely failed to simplify after ${MAX_RETRIES + 1} attempts. Returning null.`);
    return null;
  }

  return {
    simplifyText
  };
})();
