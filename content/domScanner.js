/**
 * NEURO-READS — DOM Scanner
 * 
 * Scans for block-level textual elements, ensuring we don't overlap
 * or conflict with navigational and structural components.
 */

// eslint-disable-next-line no-var
var NeuroReadsDomScanner = (() => {
  'use strict';

  // Elements whose whole text content we want to process
  // We removed structural tags like <article> to avoid double-processing nested <p>s
  const TARGET_SELECTORS = [
    'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'td', 'th', 'figcaption', 'blockquote'
  ];

  // Elements we must never modify or parse inside
  const SKIP_TAGS = new Set([
    'CODE', 'PRE', 'NAV', 'BUTTON', 'INPUT', 'TEXTAREA',
    'SCRIPT', 'STYLE', 'SVG', 'CANVAS', 'NOSCRIPT',
    'SELECT', 'OPTION', 'LABEL', 'IFRAME', 'OBJECT',
    'HEADER', 'FOOTER', 'ASIDE', 'FORM'
  ]);

  /**
   * Check if an element or any of its ancestors is in the skip list.
   */
  function isInsideSkippedElement(node) {
    let current = node;
    while (current && current !== document.body && current !== document.documentElement) {
      if (SKIP_TAGS.has(current.tagName)) return true;
      if (current.isContentEditable) return true;
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Scan the DOM and return an array of objects:
   *   { element: Element, originalHtml: string, textToProcess: string }
   * 
   * Returns valid, non-overlapping block-level elements.
   */
  function scan(root = document.body) {
    const results = [];
    const elements = Array.from(root.querySelectorAll(TARGET_SELECTORS.join(',')));
    
    if (root.matches && root.matches(TARGET_SELECTORS.join(','))) {
      elements.unshift(root);
    }

    for (const element of elements) {
      if (isInsideSkippedElement(element)) continue;
      
      // We check if this element CONTAINS another target element
      // to prevent overlapping (e.g., blockquote holding a p).
      // If it contains a p, we let the p be processed instead.
      const containsTarget = TARGET_SELECTORS.some(sel => element.querySelector(sel));
      if (containsTarget) continue;

      const text = element.textContent.trim();
      if (!text) continue;

      results.push({
        element,
        originalHtml: element.innerHTML,
        textToProcess: element.textContent
      });
    }

    return results;
  }

  return {
    scan,
    TARGET_SELECTORS,
    SKIP_TAGS
  };
})();
