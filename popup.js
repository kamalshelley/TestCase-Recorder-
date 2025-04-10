// popup.js - Controls the popup interface and interacts with background script
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startRecording');
  const stopBtn = document.getElementById('stopRecording');
  const clearBtn = document.getElementById('clearRecording');
  const exportBtn = document.getElementById('exportTestCase');
  const copyBtn = document.getElementById('copySteps');
  const recordingStatus = document.getElementById('recordingStatus');
  const recordedSteps = document.getElementById('recordedSteps');
  const captureScreenshots = document.getElementById('captureScreenshots');
  const recordScreen = document.getElementById('recordScreen');
  const captureSelectors = document.getElementById('captureSelectors');
  const languageSelect = document.getElementById('language');
  
  // System info elements
  const browserInfo = document.getElementById('browserInfo');
  const osInfo = document.getElementById('osInfo');
  const resolutionInfo = document.getElementById('resolutionInfo');
  const timestampInfo = document.getElementById('timestampInfo');
  
  // Load system info
  populateSystemInfo();
  
  // Load previous session data
  chrome.storage.local.get(['isRecording', 'steps'], function(data) {
    if (data.isRecording) {
      updateUIForRecording(true);
    }
    
    if (data.steps && data.steps.length > 0) {
      renderSteps(data.steps);
      exportBtn.disabled = false;
      copyBtn.disabled = false;
      clearBtn.disabled = false;
    }
  });
  
  // Event listeners for buttons
  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  clearBtn.addEventListener('click', clearRecording);
  exportBtn.addEventListener('click', exportTestCase);
  copyBtn.addEventListener('click', copySteps);
  
  function startRecording() {
    const options = {
      captureScreenshots: captureScreenshots.checked,
      recordScreen: recordScreen.checked,
      captureSelectors: captureSelectors.checked,
      language: languageSelect.value
    };
    
    chrome.runtime.sendMessage({
      action: 'startRecording',
      options: options
    }, function() {
      updateUIForRecording(true);
      updateSystemTimestamp();
      
      // Save recording state
      chrome.storage.local.set({
        isRecording: true,
        recordingOptions: options
      });
    });
  }
  
  function stopRecording() {
    chrome.runtime.sendMessage({action: 'stopRecording'}, function() {
      updateUIForRecording(false);
      
      // Save recording state
      chrome.storage.local.set({isRecording: false});
      
      // Refresh steps display
      chrome.storage.local.get(['steps'], function(data) {
        if (data.steps && data.steps.length > 0) {
          renderSteps(data.steps);
          exportBtn.disabled = false;
          copyBtn.disabled = false;
          clearBtn.disabled = false;
        }
      });
    });
  }
  
  function clearRecording() {
    chrome.storage.local.set({steps: []}, function() {
      recordedSteps.innerHTML = '<p class="empty-state">No steps recorded yet</p>';
      exportBtn.disabled = true;
      copyBtn.disabled = true;
      clearBtn.disabled = true;
    });
  }
  
  function exportTestCase() {
    chrome.storage.local.get(['steps', 'systemInfo'], function(data) {
      if (!data.steps || data.steps.length === 0) return;
      
      let content = generateTestCaseContent(data.steps, data.systemInfo);
      
      // Create blob and download
      const blob = new Blob([content], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TestCase_' + new Date().toISOString().slice(0,19).replace(/:/g,'-') + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  
  function copySteps() {
    chrome.storage.local.get(['steps', 'systemInfo'], function(data) {
      if (!data.steps || data.steps.length === 0) return;
      
      let content = generateTestCaseContent(data.steps, data.systemInfo);
      
      navigator.clipboard.writeText(content).then(function() {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(function() {
          copyBtn.textContent = originalText;
        }, 2000);
      });
    });
  }
  
  function updateUIForRecording(isRecording) {
    startBtn.disabled = isRecording;
    stopBtn.disabled = !isRecording;
    captureScreenshots.disabled = isRecording;
    recordScreen.disabled = isRecording;
    captureSelectors.disabled = isRecording;
    languageSelect.disabled = isRecording;
    
    if (isRecording) {
      recordingStatus.innerHTML = '<span>Recording in progress...</span>';
      recordingStatus.classList.add('active');
    } else {
      recordingStatus.innerHTML = '<span>Not Recording</span>';
      recordingStatus.classList.remove('active');
    }
  }
  
  function renderSteps(steps) {
    if (!steps || steps.length === 0) {
      recordedSteps.innerHTML = '<p class="empty-state">No steps recorded yet</p>';
      return;
    }
    
    recordedSteps.innerHTML = '';
    
    steps.forEach((step, index) => {
      const stepItem = document.createElement('div');
      stepItem.className = 'step-item';
      
      const stepHeader = document.createElement('div');
      stepHeader.className = 'step-header';
      stepHeader.innerHTML = `<span>Step ${index + 1}: ${step.action}</span><span>${step.timestamp}</span>`;
      
      const stepDetails = document.createElement('div');
      stepDetails.className = 'step-details';
      stepDetails.textContent = step.description;
      
      stepItem.appendChild(stepHeader);
      stepItem.appendChild(stepDetails);
      
      if (step.selectors) {
        const stepSelectors = document.createElement('div');
        stepSelectors.className = 'step-selectors';
        stepSelectors.innerHTML = `XPath: ${step.selectors.xpath}<br>CSS: ${step.selectors.css}`;
        stepItem.appendChild(stepSelectors);
      }
      
      if (step.screenshot) {
        const thumbnail = document.createElement('img');
        thumbnail.className = 'step-thumbnail';
        thumbnail.src = step.screenshot;
        thumbnail.alt = 'Screenshot of action';
        stepItem.appendChild(thumbnail);
      }
      
      recordedSteps.appendChild(stepItem);
    });
  }
  
  function generateTestCaseContent(steps, systemInfo) {
    let content = '============== TEST CASE REPORT ==============\n\n';
    
    // Add system info
    content += '=== SYSTEM INFORMATION ===\n';
    content += `Browser: ${systemInfo.browser}\n`;
    content += `OS: ${systemInfo.os}\n`;
    content += `Resolution: ${systemInfo.resolution}\n`;
    content += `Timestamp: ${systemInfo.timestamp}\n\n`;
    
    // Add steps
    content += '=== STEPS TO REPRODUCE ===\n';
    
    steps.forEach((step, index) => {
      content += `Step ${index + 1}: ${step.action}\n`;
      content += `Description: ${step.description}\n`;
      
      if (step.selectors) {
        content += `XPath: ${step.selectors.xpath}\n`;
        content += `CSS Selector: ${step.selectors.css}\n`;
      }
      
      content += `Timestamp: ${step.timestamp}\n`;
      content += '\n';
    });
    
    content += '=== END OF TEST CASE ===\n';
    return content;
  }
  
  function populateSystemInfo() {
    // Get browser info
    let browserName = navigator.userAgent;
    if (browserName.indexOf('Chrome') > -1) {
      browserName = 'Chrome ' + browserName.match(/Chrome\/(\d+\.\d+)/)[1];
    } else if (browserName.indexOf('Firefox') > -1) {
      browserName = 'Firefox ' + browserName.match(/Firefox\/(\d+\.\d+)/)[1];
    } else if (browserName.indexOf('Edge') > -1) {
      browserName = 'Edge ' + browserName.match(/Edge\/(\d+\.\d+)/)[1];
    }
    
    // Get OS info
    let osName = 'Unknown OS';
    if (navigator.userAgent.indexOf('Win') > -1) osName = 'Windows';
    else if (navigator.userAgent.indexOf('Mac') > -1) osName = 'MacOS';
    else if (navigator.userAgent.indexOf('Linux') > -1) osName = 'Linux';
    else if (navigator.userAgent.indexOf('Android') > -1) osName = 'Android';
    else if (navigator.userAgent.indexOf('iOS') > -1) osName = 'iOS';
    
    // Get resolution
    const resolution = `${window.screen.width}x${window.screen.height}`;
    
    // Update UI
    browserInfo.textContent = `Browser: ${browserName}`;
    osInfo.textContent = `OS: ${osName}`;
    resolutionInfo.textContent = `Resolution: ${resolution}`;
    
    // Save to storage
    const systemInfo = {
      browser: browserName,
      os: osName,
      resolution: resolution,
      timestamp: new Date().toLocaleString()
    };
    
    chrome.storage.local.set({systemInfo: systemInfo});
  }
  
  function updateSystemTimestamp() {
    const timestamp = new Date().toLocaleString();
    timestampInfo.textContent = `Start Time: ${timestamp}`;
    
    chrome.storage.local.get(['systemInfo'], function(data) {
      if (data.systemInfo) {
        data.systemInfo.timestamp = timestamp;
        chrome.storage.local.set({systemInfo: data.systemInfo});
      }
    });
  }
  
  // Listen for step updates from content script/background
  chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'stepRecorded') {
      chrome.storage.local.get(['steps'], function(data) {
        renderSteps(data.steps || []);
        exportBtn.disabled = false;
        copyBtn.disabled = false;
        clearBtn.disabled = false;
      });
    }
  });
});
