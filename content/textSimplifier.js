/**
 * NEURO-READS — Text Simplifier (Viewport-Optimized)
 * 
 * Flow:
 *   1. Scan DOM for target parent elements
 *   2. Observe each element with IntersectionObserver
 *   3. When an element enters the viewport → simplify text directly at block level
 *   4. Rewrite element.textContent with simplified content
 *   5. Unobserve that element
 */

// eslint-disable-next-line no-var
var NeuroReadsTextSimplifier = (() => {
  'use strict';

  let observer = null;
  let isEnabled = false;
  let activeRequests = 0;
  const MAX_CONCURRENT = 3;
  
  // WeakSets/Arrays for tracking
  const processedElements = new WeakSet();
  const allTrackedItems = [];
  const pendingQueue = [];

  function updateLoadingIndicator() {
    const existing = document.getElementById('neuroreads-loading');
    if (activeRequests > 0) {
      if (!existing) {
        const indicator = document.createElement('div');
        indicator.id = 'neuroreads-loading';
        indicator.innerHTML = `
          <div style="
            position: fixed; bottom: 24px; right: 24px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white; padding: 12px 20px; border-radius: 12px;
            font-family: 'Inter', system-ui, sans-serif; font-size: 14px;
            z-index: 999999; box-shadow: 0 8px 32px rgba(99, 102, 241, 0.35);
            display: flex; align-items: center; gap: 10px;
            animation: neuroreads-fadein 0.3s ease;
          ">
            <div style="
              width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
              border-top-color: white; border-radius: 50%;
              animation: neuroreads-spin 0.8s linear infinite;
            "></div>
            <span id="neuroreads-loading-text">Simplifying visible text…</span>
          </div>
          <style>
            @keyframes neuroreads-spin { to { transform: rotate(360deg); } }
            @keyframes neuroreads-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          </style>
        `;
        document.body.appendChild(indicator);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  async function processElement(element) {
    if (processedElements.has(element)) return;
    if (!isEnabled) return;
    processedElements.add(element);

    // Call scanner starting from this element
    // It returns [{element, originalHtml, textToProcess}] 
    // We only process if it's a valid block target itself
    const items = NeuroReadsDomScanner.scan(element);
    if (items.length === 0) return;

    // To prevent overlap, we process the elements strictly linearly
    // But since `element` is exactly what entered viewport, `items` should primarily be the valid blocks within/including it.
    for (const item of items) {
      if (!isEnabled) break;
      if (NeuroReadsDomRewriter.isModified(item.element)) continue;

      if (!NeuroReadsTextProcessor.isWorthSimplifying(item.textToProcess)) {
        continue;
      }

      activeRequests++;
      updateLoadingIndicator();

      try {
        // Track for undo
        allTrackedItems.push(item);

        // 1. Entities Protection
        const { maskedText, entityMap } = NeuroReadsTextProcessor.protectEntities(item.textToProcess);

        // 2. Sentence chunking
        const sentences = NeuroReadsTextProcessor.extractSentences(maskedText);
        const chunks = NeuroReadsTextProcessor.chunkSentences(sentences);

        let simplifiedParts = [];
        let previousContext = null;

        for (const chunk of chunks) {
          if (!isEnabled) break;

          const simplifiedChunk = await NeuroReadsAI.simplifyText(chunk, previousContext);
          
          if (simplifiedChunk) {
            simplifiedParts.push(simplifiedChunk);
            // Use end of this chunk as context hint for next
            previousContext = simplifiedChunk.slice(-100); 
          } else {
            // Fallback to original text if AI fails completely on this chunk
            simplifiedParts.push(chunk);
          }
        }

        if (simplifiedParts.length > 0 && isEnabled) {
          const combinedSimplified = simplifiedParts.join(' ');
          // 3. Restore Entities
          const finalText = NeuroReadsTextProcessor.restoreEntities(combinedSimplified, entityMap);

          // 4. Batch DOM Rewrite
          await NeuroReadsDomRewriter.batchReplace([{
            element: item.element,
            newText: finalText,
            originalHtml: item.originalHtml
          }]);
        }
      } catch (error) {
        console.error('[NEURO-READS] Error processing element:', error);
      } finally {
        activeRequests--;
        updateLoadingIndicator();
      }
    }
    
    drainQueue();
  }

  function drainQueue() {
    while (pendingQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
      const element = pendingQueue.shift();
      if (!processedElements.has(element) && isEnabled) {
        processElement(element);
      }
    }
  }

  function enqueue(element) {
    if (processedElements.has(element)) return;
    if (pendingQueue.includes(element)) return;

    if (activeRequests < MAX_CONCURRENT) {
      processElement(element);
    } else {
      pendingQueue.push(element);
    }
  }

  function createObserver() {
    if (observer) return;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // Enforce top-level visibility capturing
        if (entry.isIntersecting && isEnabled) {
          const element = entry.target;
          observer.unobserve(element);
          enqueue(element);
        }
      }
    }, {
      rootMargin: '200px 0px',
      threshold: 0
    });
  }

  function observeAllElements() {
    createObserver();
    const selectors = NeuroReadsDomScanner.TARGET_SELECTORS.join(',');
    const elements = document.body.querySelectorAll(selectors);

    for (const el of elements) {
      if (processedElements.has(el)) continue;
      if (el.id?.startsWith('neuroreads-')) continue;
      
      // Since domScanner handles SKIP_TAGS filtering, we do a basic check here
      const skipSet = NeuroReadsDomScanner.SKIP_TAGS;
      if (skipSet.has(el.tagName)) continue;

      observer.observe(el);
    }
  }

  function observeNewElements(rootNode) {
    if (!observer || !isEnabled) return;
    const selectors = NeuroReadsDomScanner.TARGET_SELECTORS.join(',');
    let elements = [];

    if (rootNode.matches && rootNode.matches(selectors)) {
      elements.push(rootNode);
    }
    if (rootNode.querySelectorAll) {
      elements.push(...rootNode.querySelectorAll(selectors));
    }

    for (const el of elements) {
      if (processedElements.has(el)) continue;
      if (el.id?.startsWith('neuroreads-')) continue;
      observer.observe(el);
    }
  }

  function startSimplification() {
    isEnabled = true;
    observeAllElements();
  }

  function restorePage() {
    isEnabled = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    pendingQueue.length = 0;

    if (allTrackedItems.length > 0) {
      NeuroReadsDomRewriter.restoreAll(allTrackedItems);
    }
    allTrackedItems.length = 0;
    
    updateLoadingIndicator();
  }

  function isBusy() {
    return activeRequests > 0;
  }

  return {
    startSimplification,
    restorePage,
    observeNewElements,
    isBusy
  };
})();
