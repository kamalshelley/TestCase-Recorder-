// panel.js - Script for the testing panel interface
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const stepsListContainer = document.querySelector('.steps-list');
  const screenshotGallery = document.querySelector('.screenshot-gallery');
  const codeView = document.querySelector('.code-view');
  const exportBtn = document.getElementById('exportCode');
  const copyBtn = document.getElementById('copyCode');
  const languageSelect = document.getElementById('codeLanguage');
  
  // Load recorded steps
  loadRecordedData();
  
  // Event listeners
  if (exportBtn) exportBtn.addEventListener('click', exportTestCode);
  if (copyBtn) copyBtn.addEventListener('click', copyTestCode);
  if (languageSelect) languageSelect.addEventListener('change', generateCode);
  
  function loadRecordedData() {
    chrome.storage.local.get(['steps', 'systemInfo'], function(data) {
      if (data.steps && data.steps.length > 0) {
        renderStepsList(data.steps);
        renderScreenshots(data.steps);
        generateCode();
      } else {
        if (stepsListContainer) {
          stepsListContainer.innerHTML = '<div class="no-steps">No steps recorded yet</div>';
        }
        if (screenshotGallery) {
          screenshotGallery.innerHTML = '<div class="no-screenshots">No screenshots available</div>';
        }
      }
      
      // Display system info if available
      if (data.systemInfo) {
        displaySystemInfo(data.systemInfo);
      }
    });
  }
  
  function renderStepsList(steps) {
    if (!stepsListContainer) return;
    
    stepsListContainer.innerHTML = '';
    
    steps.forEach((step, index) => {
      const stepItem = document.createElement('div');
      stepItem.className = 'step-item';
      stepItem.dataset.index = index;
      
      const stepContent = `
        <span class="step-id">${index + 1}</span>
        <span class="step-type">${step.action}</span>
        <div class="step-element">${step.description}</div>
      `;
      
      stepItem.innerHTML = stepContent;
      
      // Add click event to select step
      stepItem.addEventListener('click', function() {
        document.querySelectorAll('.step-item').forEach(item => {
          item.classList.remove('selected');
        });
        this.classList.add('selected');
        
        // Show step details
        showStepDetails(step);
      });
      
      stepsListContainer.appendChild(stepItem);
    });
    
    // Select first step by default
    if (steps.length > 0) {
      stepsListContainer.querySelector('.step-item').classList.add('selected');
      showStepDetails(steps[0]);
    }
  }
  
  function renderScreenshots(steps) {
    if (!screenshotGallery) return;
    
    screenshotGallery.innerHTML = '';
    
    // Filter steps with screenshots
    const screenshotSteps = steps.filter(step => step.screenshot);
    
    if (screenshotSteps.length === 0) {
      screenshotGallery.innerHTML = '<div class="no-screenshots">No screenshots available</div>';
      return;
    }
    
    screenshotSteps.forEach((step, index) => {
      const screenshotItem = document.createElement('div');
      screenshotItem.className = 'screenshot-item';
      
      const screenshotContent = `
        <img src="${step.screenshot}" class="screenshot-image" alt="Screenshot of step ${index + 1}">
        <div class="screenshot-info">
          <div>Step ${index + 1}: ${step.action}</div>
          <div class="screenshot-timestamp">${step.timestamp}</div>
        </div>
      `;
      
      screenshotItem.innerHTML = screenshotContent;
      
      // Add click event to zoom screenshot
      screenshotItem.querySelector('.screenshot-image').addEventListener('click', function() {
        showScreenshotZoom(step.screenshot);
      });
      
      screenshotGallery.appendChild(screenshotItem);
    });
  }
  
  function showScreenshotZoom(imageUrl) {
    const zoomContainer = document.createElement('div');
    zoomContainer.className = 'screenshot-zoom';
    
    const zoomContent = `
      <img src="${imageUrl}" alt="Zoomed screenshot">
      <div class="screenshot-controls">
        <button class="screenshot-close">&times;</button>
      </div>
    `;
    
    zoomContainer.innerHTML = zoomContent;
    
    // Add close events
    zoomContainer.addEventListener('click', function() {
      document.body.removeChild(this);
    });
    
    zoomContainer.querySelector('.screenshot-close').addEventListener('click', function(e) {
      e.stopPropagation();
      document.body.removeChild(zoomContainer);
    });
    
    document.body.appendChild(zoomContainer);
  }
  
  function showStepDetails(step) {
    // Update code view with step details
    if (codeView) {
      const details = `// Step Details
Action: ${step.action}
Description: ${step.description}
Timestamp: ${step.timestamp}

${step.selectors ? `// Selectors
XPath: ${step.selectors.xpath}
CSS Selector: ${step.selectors.css}` : '// No selectors available'}
`;
      
      codeView.textContent = details;
    }
  }
  
  function generateCode() {
    if (!codeView || !languageSelect) return;
    
    const language = languageSelect.value;
    
    chrome.storage.local.get(['steps', 'systemInfo'], function(data) {
      if (!data.steps || data.steps.length === 0) {
        codeView.textContent = '// No steps recorded yet';
        return;
      }
      
      let code = '';
      
      // Generate code based on selected language
      switch (language) {
        case 'js-puppeteer':
          code = generatePuppeteerCode(data.steps, data.systemInfo);
          break;
        case 'js-playwright':
          code = generatePlaywrightCode(data.steps, data.systemInfo);
          break;
        case 'python-selenium':
          code = generatePythonSeleniumCode(data.steps, data.systemInfo);
          break;
        case 'java-selenium':
          code = generateJavaSeleniumCode(data.steps, data.systemInfo);
          break;
        case 'csharp-selenium':
          code = generateCSharpSeleniumCode(data.steps, data.systemInfo);
          break;
        default:
          code = generateManualTestCaseCode(data.steps, data.systemInfo);
      }
      
      codeView.textContent = code;
      highlightCode();
    });
  }
  
  function generateManualTestCaseCode(steps, systemInfo) {
    let code = '=== TEST CASE ===\n\n';
    
    // Add system info
    code += '-- Environment --\n';
    if (systemInfo) {
      code += `Browser: ${systemInfo.browser}\n`;
      code += `OS: ${systemInfo.os}\n`;
      code += `Resolution: ${systemInfo.resolution}\n`;
      code += `Date: ${systemInfo.timestamp}\n`;
    }
    code += '\n-- Steps to Reproduce --\n\n';
    
    // Add steps
    steps.forEach((step, index) => {
      code += `${index + 1}. ${step.description}\n`;
      
      if (step.selectors) {
        code += `   Element: XPath: ${step.selectors.xpath}\n`;
        code += `   Element: CSS: ${step.selectors.css}\n`;
      }
      
      code += '\n';
    });
    
    code += '-- End of Test Case --';
    return code;
  }
  
  function generatePuppeteerCode(steps, systemInfo) {
    let code = `// Generated Puppeteer Test Script
// Environment: ${systemInfo ? systemInfo.browser + ', ' + systemInfo.os : 'Unknown'}
// Date: ${systemInfo ? systemInfo.timestamp : new Date().toLocaleString()}

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
`;
    
    // Add steps
    steps.forEach((step) => {
      code += '\n    // ' + step.description + '\n';
      
      if (step.action === 'Navigate to') {
        const url = step.description.split('Navigate to ')[1];
        code += `    await page.goto('${url}', { waitUntil: 'networkidle2' });\n`;
      } else if (step.action === 'Click') {
        if (step.selectors && step.selectors.css) {
          code += `    await page.waitForSelector('${step.selectors.css}');\n`;
          code += `    await page.click('${step.selectors.css}');\n`;
        } else {
          code += `    // TODO: Add selector for the click action\n`;
        }
      } else if (step.action === 'Input') {
        if (step.selectors && step.selectors.css) {
          const valueMatch = step.description.match(/"([^"]*)"/);
          const value = valueMatch ? valueMatch[1] : '';
          
          code += `    await page.waitForSelector('${step.selectors.css}');\n`;
          code += `    await page.type('${step.selectors.css}', '${value}');\n`;
        } else {
          code += `    // TODO: Add selector for the input action\n`;
        }
      }
    });
    
    code += `
    // Test completed successfully
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();`;
    
    return code;
  }
  
  // Implement other code generators here...
  function generatePlaywrightCode(steps, systemInfo) {
    // Placeholder for Playwright code generator
    return '// Playwright code generation not implemented yet';
  }
  
  function generatePythonSeleniumCode(steps, systemInfo) {
    // Placeholder for Python Selenium code generator
    return '# Python Selenium code generation not implemented yet';
  }
  
  function generateJavaSeleniumCode(steps, systemInfo) {
    // Placeholder for Java Selenium code generator
    return '// Java Selenium code generation not implemented yet';
  }
  
  function generateCSharpSeleniumCode(steps, systemInfo) {
    // Placeholder for C# Selenium code generator
    return '// C# Selenium code generation not implemented yet';
  }
  
  function displaySystemInfo(systemInfo) {
    const infoElements = {
      browser: document.querySelector('.info-browser'),
      os: document.querySelector('.info-os'),
      resolution: document.querySelector('.info-resolution'),
      timestamp: document.querySelector('.info-timestamp')
    };
    
    if (infoElements.browser) infoElements.browser.textContent = systemInfo.browser;
    if (infoElements.os) infoElements.os.textContent = systemInfo.os;
    if (infoElements.resolution) infoElements.resolution.textContent = systemInfo.resolution;
    if (infoElements.timestamp) infoElements.timestamp.textContent = systemInfo.timestamp;
  }
  
  function exportTestCode() {
    const code = codeView.textContent;
    const language = languageSelect.value;
    
    let extension = 'txt';
    switch (language) {
      case 'js-puppeteer':
      case 'js-playwright':
        extension = 'js';
        break;
      case 'python-selenium':
        extension = 'py';
        break;
      case 'java-selenium':
        extension = 'java';
        break;
      case 'csharp-selenium':
        extension = 'cs';
        break;
    }
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TestCase_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function copyTestCode() {
    const code = codeView.textContent;
    
    navigator.clipboard.writeText(code).then(function() {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(function() {
        copyBtn.textContent = originalText;
      }, 2000);
    });
  }
  
  function highlightCode() {
    // Simple syntax highlighting could be implemented here
    // For a full solution, you might want to include a library like highlight.js
  }
});