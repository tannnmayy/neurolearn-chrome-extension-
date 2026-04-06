/**
 * NEURO-READS — DOM Rewriter
 * 
 * Safely replaces text content of elements while storing origin innerHTML
 * so that structure (links, tags) can be perfectly restored on demand.
 */

// eslint-disable-next-line no-var
var NeuroReadsDomRewriter = (() => {
  'use strict';

  // Store original HTML for undo — keyed by element reference
  const originalHtmlMap = new WeakMap();
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 50;

  /**
   * Replace text in a single element block, storing the original for undo.
   */
  function replaceElementContent(element, newText, originalHtml) {
    if (!element) return;
    if (!newText || typeof newText !== 'string') return;

    // Store original if not already stored
    if (!originalHtmlMap.has(element)) {
      originalHtmlMap.set(element, originalHtml || element.innerHTML);
    }

    // Setting textContent wipes out internal nodes (e.g. <a>) natively
    element.textContent = newText;
  }

  /**
   * Restore a single element to its original HTML content.
   */
  function restoreElement(element) {
    if (originalHtmlMap.has(element)) {
      element.innerHTML = originalHtmlMap.get(element);
      originalHtmlMap.delete(element);
    }
  }

  /**
   * Replace text in multiple elements (array of { element, newText, originalHtml }).
   */
  function batchReplace(replacements) {
    return new Promise((resolve) => {
      let index = 0;

      function processBatch() {
        const end = Math.min(index + BATCH_SIZE, replacements.length);
        for (; index < end; index++) {
          const { element, newText, originalHtml } = replacements[index];
          replaceElementContent(element, newText, originalHtml);
        }

        if (index < replacements.length) {
          setTimeout(processBatch, BATCH_DELAY_MS);
        } else {
          resolve();
        }
      }

      processBatch();
    });
  }

  /**
   * Restore all elements that have been modified.
   * Accepts an array of { element } objects (same format as scanner output).
   */
  function restoreAll(scannedNodes) {
    for (const item of scannedNodes) {
      if (item.element) {
        restoreElement(item.element);
      }
    }
  }

  function isModified(element) {
    return originalHtmlMap.has(element);
  }

  return {
    replaceElementContent,
    restoreElement,
    batchReplace,
    restoreAll,
    isModified
  };
})();
