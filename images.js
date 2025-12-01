(function () {
  var NAMESPACE = '_mqImgAlt';

  // If already active, run cleanup and exit (toggle behavior)
  if (window[NAMESPACE] && typeof window[NAMESPACE].cleanup === 'function') {
    window[NAMESPACE].cleanup();
    return;
  }

  var doc = document;
  var imgs = doc.getElementsByTagName('img');
  var labels = [];
  var listeners = [];
  var containerId = 'mq-img-alt-labels-container';

  // Create a container for all labels (one per document)
  var container = doc.getElementById(containerId);
  if (!container) {
    container = doc.createElement('div');
    container.id = containerId;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '0';
    container.style.height = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483647';
    doc.body.appendChild(container);
  }

  // Utility: add event listener and remember it for cleanup
  function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push({ target: target, type: type, handler: handler, options: options });
  }

  // Utility: create label element
  function makeLabel(text) {
    var span = doc.createElement('span');
    span.textContent = text;
    span.style.position = 'absolute';
    span.style.fontFamily = 'monospace, system-ui, sans-serif';
    span.style.fontSize = '11px';
    span.style.background = 'yellow';
    span.style.color = 'black';
    span.style.padding = '2px 4px';
    span.style.border = '1px solid black';
    span.style.whiteSpace = 'nowrap';
    span.style.pointerEvents = 'none';
    span.style.boxSizing = 'border-box';
    container.appendChild(span);
    return span;
  }

  // First restore anything we might have touched before (if the script ran in this doc)
  var previouslyMarked = doc.querySelectorAll('img[data-mq-alt-outline]');
  for (var j = 0; j < previouslyMarked.length; j++) {
    var prev = previouslyMarked[j];
    var origOutline = prev.getAttribute('data-mq-alt-outline');
    prev.style.outline = origOutline || '';
    prev.removeAttribute('data-mq-alt-outline');
  }

  // Process all images
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];

    // Skip if not rendered (no layout box)
    var rect = img.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      continue;
    }

    var hasAltAttr = img.hasAttribute('alt');
    var altValue = hasAltAttr ? img.getAttribute('alt') : null;

    // Save original inline outline so we can restore
    img.setAttribute('data-mq-alt-outline', img.style.outline || '');

    if (hasAltAttr) {
      // Pink dashed outline for images with alt (even empty)
      img.style.outline = '3px dashed hotpink';

      // Label: alt="..." (empty alt shown as alt="")
      var labelText = 'alt="' + (altValue || '') + '"';
      var label = makeLabel(labelText);
      labels.push({ img: img, label: label });
    } else {
      // Red dashed outline for images without alt
      img.style.outline = '3px dashed red';
      // No label for missing alt, to keep visual noise lower
    }
  }

  // Position labels on top of their images
  function updatePositions() {
    for (var k = 0; k < labels.length; k++) {
      var pair = labels[k];
      var img = pair.img;
      var label = pair.label;

      // If image disappeared, hide label
      if (!img || !img.ownerDocument || img.ownerDocument !== doc) {
        label.style.display = 'none';
        continue;
      }

      var rect = img.getBoundingClientRect();
      label.style.top = (window.scrollY + rect.top) + 'px';
      label.style.left = (window.scrollX + rect.left) + 'px';
    }
  }

  updatePositions();
  addListener(window, 'scroll', updatePositions, true);
  addListener(window, 'resize', updatePositions, true);

  // Optional: simple observer to reposition when layout changes a lot
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      updatePositions();
    });
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true });
    listeners.push({ target: mo, type: 'mutationobserver', handler: null, options: null });
  }

  // Store state + cleanup on window
  window[NAMESPACE] = {
    cleanup: function () {
      // Remove event listeners
      for (var m = 0; m < listeners.length; m++) {
        var l = listeners[m];
        if (l.target instanceof MutationObserver) {
          l.target.disconnect();
        } else {
          l.target.removeEventListener(l.type, l.handler, l.options);
        }
      }

      // Restore outlines
      var marked = doc.querySelectorAll('img[data-mq-alt-outline]');
      for (var n = 0; n < marked.length; n++) {
        var el = marked[n];
        var origOutline = el.getAttribute('data-mq-alt-outline');
        el.style.outline = origOutline || '';
        el.removeAttribute('data-mq-alt-outline');
      }

      // Remove labels
      for (var p = 0; p < labels.length; p++) {
        var lab = labels[p].label;
        if (lab && lab.parentNode) {
          lab.parentNode.removeChild(lab);
        }
      }

      // Remove empty container
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }

      delete window[NAMESPACE];
    }
  };
})();
