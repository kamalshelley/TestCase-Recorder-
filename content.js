// content.js - Content script injected into web pages
let isRecording = false;
let recordingOptions = {
  captureScreenshots: true,
  recordScreen: false,
  captureSelectors: true,
  language: 'en'
};

// Translations for common actions
const translations = {
  'click': {
    'en': 'Click',
    'de': 'Klick',
    'fr': 'Clic',
    'es': 'Clic',
    'zh': '点击'
  },
  'input': {
    'en': 'Input',
    'de': 'Eingabe',
    'fr': 'Saisie',
    'es': 'Entrada',
    'zh': '输入'
  },
  'navigate': {
    'en': 'Navigate to',
    'de': 'Navigieren zu',
    'fr': 'Naviguer vers',
    'es': 'Navegar a',
    'zh': '导航至'
  },
  'on': {
    'en': 'on',
    'de': 'auf',
    'fr': 'sur',
    'es': 'en',
    'zh': '在'
  }
};

// Listen for recording control messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'startRecording') {
    isRecording = true;
    recordingOptions = message.options;
    setupEventListeners();
    sendResponse({success: true});
  } else if (message.action === 'stopRecording') {
    isRecording = false;
    removeEventListeners();
    sendResponse({success: true});
  }
});

// Event listeners
let clickListener, inputListener, navigationListener;

function setupEventListeners() {
  // Listen for clicks
  clickListener = document.addEventListener('click', handleClick, true);
  
  // Listen for input changes
  inputListener = document.addEventListener('change', handleInput, true);
  
  // Listen for navigation events
  navigationListener = window.addEventListener('beforeunload', handleNavigation);
}

function removeEventListeners() {
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('change', handleInput, true);
  window.removeEventListener('beforeunload', handleNavigation);
}

function handleClick(event) {
  if (!isRecording) return;
  
  const element = event.target;
  const elementInfo = getElementInfo(element);
  
  // Create step data
  const step = {
    action: translate('click'),
    description: `${translate('click')} ${translate('on')} ${elementInfo.description}`,
    selectors: null,
    screenshot: null
  };
  
  if (recordingOptions.captureSelectors) {
    step.selectors = {
      xpath: elementInfo.xpath,
      css: elementInfo.cssSelector
    };
  }
  
  if (recordingOptions.captureScreenshots) {
    // Request screenshot from background script
    chrome.runtime.sendMessage({
      action: 'captureScreenshot',
      elementInfo: {
        x: event.pageX,
        y: event.pageY,
        width: element.offsetWidth,
        height: element.offsetHeight
      }
    }, function(response) {
      if (response && response.success) {
        step.screenshot = response.imageData;
        
        // Record step with screenshot
        chrome.runtime.sendMessage({
          action: 'recordStep',
          step: step
        });
      }
    });
  } else {
    // Record step without screenshot
    chrome.runtime.sendMessage({
      action: 'recordStep',
      step: step
    });
  }
}

function handleInput(event) {
  if (!isRecording) return;
  
  const element = event.target;
  const elementInfo = getElementInfo(element);
  let value = element.value;
  
  // Mask password input values
  if (element.type === 'password') {
    value = '********';
  }
  
  // Create step data
  const step = {
    action: translate('input'),
    description: `${translate('input')} "${value}" ${translate('on')} ${elementInfo.description}`,
    selectors: null,
    screenshot: null
  };
  
  if (recordingOptions.captureSelectors) {
    step.selectors = {
      xpath: elementInfo.xpath,
      css: elementInfo.cssSelector
    };
  }
  
  if (recordingOptions.captureScreenshots) {
    // Request screenshot from background script
    chrome.runtime.sendMessage({
      action: 'captureScreenshot',
      elementInfo: {
        x: element.getBoundingClientRect().left,
        y: element.getBoundingClientRect().top,
        width: element.offsetWidth,
        height: element.offsetHeight
      }
    }, function(response) {
      if (response && response.success) {
        step.screenshot = response.imageData;
        
        // Record step with screenshot
        chrome.runtime.sendMessage({
          action: 'recordStep',
          step: step
        });
      }
    });
  } else {
    // Record step without screenshot
    chrome.runtime.sendMessage({
      action: 'recordStep',
      step: step
    });
  }
}

function handleNavigation(event) {
  if (!isRecording) return;
  
  // Create step data
  const step = {
    action: translate('navigate'),
    description: `${translate('navigate')} ${document.location.href}`,
    selectors: null,
    screenshot: null
  };
  
  // Record navigation step
  chrome.runtime.sendMessage({
    action: 'recordStep',
    step: step
  });
}

function getElementInfo(element) {
  // Get element description
  let description = getElementDescription(element);
  
  // Generate XPath
  const xpath = generateXPath(element);
  
  // Generate CSS Selector
  const cssSelector = generateCssSelector(element);
  
  return {
    description: description,
    xpath: xpath,
    cssSelector: cssSelector
  };
}

function getElementDescription(element) {
  // Try to get a meaningful description of the element
  if (element.id) {
    return `${element.tagName.toLowerCase()} with id "${element.id}"`;
  }
  
  if (element.name) {
    return `${element.tagName.toLowerCase()} with name "${element.name}"`;
  }
  
  if (element.className && typeof element.className === 'string' && element.className.trim() !== '') {
    return `${element.tagName.toLowerCase()} with class "${element.className}"`;
  }
  
  if (element.tagName === 'A' && element.textContent && element.textContent.trim() !== '') {
    return `link with text "${element.textContent.trim()}"`;
  }
  
  if (element.tagName === 'BUTTON' && element.textContent && element.textContent.trim() !== '') {
    return `button with text "${element.textContent.trim()}"`;
  }
  
  if (element.tagName === 'INPUT' && element.type) {
    return `${element.type} input field`;
  }
  
  if (element.tagName === 'LABEL' && element.textContent) {
    return `label with text "${element.textContent.trim()}"`;
  }
  
  // Generic fallback
  return element.tagName.toLowerCase();
}

function generateXPath(element) {
  if (!element) return '';
  
  // Check if element has ID attribute
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  // Start XPath construction
  let parts = [];
  let current = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    // Get position among siblings of same type
    let count = 1;
    let sibling = current.previousElementSibling;
    
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        count++;
      }
      sibling = sibling.previousElementSibling;
    }
    
    // Build part
    let part = current.tagName.toLowerCase();
    if (count > 1) {
      part += `[${count}]`;
    }
    
    parts.unshift(part);
    
    // Move up to parent
    current = current.parentElement;
  }
  
  return '//' + parts.join('/');
}

function generateCssSelector(element) {
  if (!element) return '';
  
  // Check if element has ID
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Build a specific selector
  let path = [];
  let current = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    // Add tag
    let selector = current.tagName.toLowerCase();
    
    // Add ID if present
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0] !== '') {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add position if needed
    let siblings = 0;
    let position = 1;
    let temp = current;
    
    while (temp) {
      if (temp.tagName === current.tagName) {
        siblings++;
        if (temp === current) position = siblings;
      }
      temp = temp.previousElementSibling;
    }
    
    if (siblings > 1) {
      selector += `:nth-of-type(${position})`;
    }
    
    path.unshift(selector);
    
    // Move up to parent
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

function translate(key) {
  // Get translation based on selected language
  const lang = recordingOptions.language;
  
  if (translations[key] && translations[key][lang]) {
    return translations[key][lang];
  }
  
  // Fallback to English
  return translations[key]['en'] || key;
}

// Handle page load for iframe support
window.addEventListener('load', function() {
  // Check if this is an iframe
  if (window !== window.top) {
    // This is an iframe, register message passing
    setupIframeMessagePassing();
  }
});

function setupIframeMessagePassing() {
  // Forward messages from iframe to top frame
  document.addEventListener('click', function(event) {
    if (!isRecording) return;
    
    // Send message to parent frame
    window.top.postMessage({
      action: 'iframeEvent',
      eventType: 'click',
      elementInfo: getElementInfo(event.target),
      position: {
        x: event.pageX,
        y: event.pageY
      }
    }, '*');
  }, true);
  
  document.addEventListener('change', function(event) {
    if (!isRecording) return;
    
    // Send message to parent frame
    window.top.postMessage({
      action: 'iframeEvent',
      eventType: 'input',
      elementInfo: getElementInfo(event.target),
      value: event.target.type === 'password' ? '********' : event.target.value
    }, '*');
  }, true);
}

// Listen for messages from iframes when in top frame
if (window === window.top) {
  window.addEventListener('message', function(event) {
    if (!isRecording) return;
    
    const message = event.data;
    
    if (message && message.action === 'iframeEvent') {
      const elementInfo = message.elementInfo;
      
      // Create step data based on event type
      if (message.eventType === 'click') {
        const step = {
          action: translate('click'),
          description: `${translate('click')} ${translate('on')} ${elementInfo.description} (in iframe)`,
          selectors: null,
          screenshot: null
        };
        
        if (recordingOptions.captureSelectors) {
          step.selectors = {
            xpath: elementInfo.xpath,
            css: elementInfo.cssSelector
          };
        }
        
        // Record step
        chrome.runtime.sendMessage({
          action: 'recordStep',
          step: step
        });
      } else if (message.eventType === 'input') {
        const step = {
          action: translate('input'),
          description: `${translate('input')} "${message.value}" ${translate('on')} ${elementInfo.description} (in iframe)`,
          selectors: null,
          screenshot: null
        };
        
        if (recordingOptions.captureSelectors) {
          step.selectors = {
            xpath: elementInfo.xpath,
            css: elementInfo.cssSelector
          };
        }
        
        // Record step
        chrome.runtime.sendMessage({
          action: 'recordStep',
          step: step
        });
      }
    }
  });
}