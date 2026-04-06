/**
 * NEURO-READS — Text Processor Utilities
 * 
 * Sentence extraction, chunking, filtering, entity protection, and validation.
 */

// eslint-disable-next-line no-var
var NeuroReadsTextProcessor = (() => {
  'use strict';

  const MIN_TEXT_LENGTH = 20;
  const MAX_CHUNK_LENGTH = 1000;

  function isWorthSimplifying(text) {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) return false;
    if (!trimmed.includes(' ')) return false;
    return true;
  }

  /**
   * Split text into sentences safely.
   */
  function extractSentences(text) {
    // Basic regex for sentence splitting, keeping the delimiter.
    // Matches ending punctuation followed by space and capital letter.
    const regex = /([^.?!]+[.?!]+(?=\s+[A-Z]|$))/g;
    const sentences = text.match(regex);
    if (!sentences) return [text.trim()];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Group sentences into chunks under MAX_CHUNK_LENGTH.
   */
  function chunkSentences(sentences, maxLen = MAX_CHUNK_LENGTH) {
    const chunks = [];
    let currentChunk = [];
    let currentLen = 0;

    for (const sentence of sentences) {
      if (currentLen + sentence.length > maxLen && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentLen = 0;
      }
      currentChunk.push(sentence);
      currentLen += sentence.length + 1; // +1 for space
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    return chunks;
  }

  /**
   * Protect Entities by replacing multi-word Capitalized terms and Acronyms.
   * Returns { maskedText, entityMap }
   */
  function protectEntities(text) {
    const entityMap = {};
    let entityCounter = 0;
    
    // Match 2+ capitalized words (e.g. Elon Musk, Formula One)
    const multiWordRegex = /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)\\b/g;
    // Match acronyms (e.g. NASA, FBI)
    const acronymRegex = /\\b([A-Z]{2,})\\b/g;

    let maskedText = text.replace(multiWordRegex, (match) => {
      const token = `[[ENT_${entityCounter++}]]`;
      entityMap[token] = match;
      return token;
    });

    maskedText = maskedText.replace(acronymRegex, (match) => {
      const token = `[[ACR_${entityCounter++}]]`;
      entityMap[token] = match;
      return token;
    });

    return { maskedText, entityMap };
  }

  /**
   * Restore protected entities back into the text.
   */
  function restoreEntities(text, entityMap) {
    let result = text;
    for (const [token, original] of Object.entries(entityMap)) {
      // Escape token for regex
      const safeToken = token.replace(/\\[/g, '\\\\[').replace(/\\]/g, '\\\\]');
      result = result.replace(new RegExp(safeToken, 'g'), original);
    }
    return result;
  }

  /**
   * Validation of AI output
   */
  function isValidOutput(original, simplified) {
    if (!simplified || typeof simplified !== 'string') return false;
    const s = simplified.trim();
    if (s.length === 0) return false;
    
    // Check for conversational artifacts
    const lowerS = s.toLowerCase();
    if (lowerS.startsWith('here is the') || lowerS.startsWith('sure')) return false;
    if (lowerS.includes('as an ai')) return false;

    // Check for repeated corrupted tokens (e.g., raciracing)
    // Three of the same consecutive substring >= 3 chars
    if (/([a-zA-Z]{3,})\\1\\1/.test(s)) return false;

    // Check for extreme truncation (< 20% of original, unless original was tiny)
    if (original.length > 50 && s.length < original.length * 0.2) return false;

    return true;
  }

  function sanitize(text) {
    if (!text) return '';
    let t = text
      .replace(/^```[\\s\\S]*?```$/gm, '')
      .replace(/^\\*\\*?|(\\*\\*?)$/gm, '')
      .replace(/\\n{3,}/g, '\\n\\n')
      .trim();
    
    // Some models wrap output in quotes
    if (t.startsWith('"') && t.endsWith('"')) {
      t = t.substring(1, t.length - 1).trim();
    }
    return t;
  }

  return {
    isWorthSimplifying,
    extractSentences,
    chunkSentences,
    protectEntities,
    restoreEntities,
    isValidOutput,
    sanitize,
    MIN_TEXT_LENGTH,
    MAX_CHUNK_LENGTH
  };
})();
