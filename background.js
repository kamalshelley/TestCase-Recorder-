// background.js - Background service worker for the extension
let recorder = null;
let mediaStream = null;
let recordingData = [];
let isRecording = false;
let recordingOptions = {
  captureScreenshots: true,
  recordScreen: false,
  captureSelectors: true,
  language: 'en'
};

// Initialize storage
chrome.storage.local.get(['steps'], function(data) {
  if (!data.steps) {
    chrome.storage.local.set({steps: []});
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.action) {
    case 'startRecording':
      startRecording(message.options);
      sendResponse({success: true});
      break;
      
    case 'stopRecording':
      stopRecording();
      sendResponse({success: true});
      break;
      
    case 'recordStep':
      recordStep(message.step);
      sendResponse({success: true});
      break;
      
    case 'captureScreenshot':
      captureScreenshot(sender.tab.id, message.elementInfo)
        .then(imageData => {
          sendResponse({success: true, imageData: imageData});
        });
      return true; // Required for async sendResponse
      
    default:
      sendResponse({success: false, error: 'Unknown action'});
  }
});

function startRecording(options = {}) {
  isRecording = true;
  recordingOptions = {...recordingOptions, ...options};
  
  // Notify all tabs that recording has started
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'startRecording',
        options: recordingOptions
      }).catch(() => {
        // Tab might not have content script loaded, which is fine
      });
    });
  });
  
  // Start screen recording if enabled
  if (recordingOptions.recordScreen) {
    startScreenRecording();
  }
}

function stopRecording() {
  isRecording = false;
  
  // Notify all tabs that recording has stopped
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'stopRecording'
      }).catch(() => {
        // Tab might not have content script loaded, which is fine
      });
    });
  });
  
  // Stop screen recording if it was started
  if (recorder) {
    recorder.stop();
  }
}

function recordStep(step) {
  // Add timestamp
  step.timestamp = new Date().toLocaleTimeString();
  
  // Save step to storage
  chrome.storage.local.get(['steps'], function(data) {
    const steps = data.steps || [];
    steps.push(step);
    
    chrome.storage.local.set({steps: steps}, function() {
      // Notify popup that a new step was recorded
      chrome.runtime.sendMessage({action: 'stepRecorded'});
    });
  });
}

// Fix for the captureScreenshot function in background.js
async function captureScreenshot(tabId, elementInfo) {
  try {
    // Capture the visible tab - corrected to not destructure the result
    const data = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
    
    if (elementInfo) {
      // We would highlight the element here if we had canvas access
      // For now, just return the screenshot
      return data;
    }
    
    return data;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

function startScreenRecording() {
  // Request desktop capture
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab'],
    function(streamId) {
      if (!streamId) return;
      
      // Get media stream
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      }).then(stream => {
        mediaStream = stream;
        
        // Create MediaRecorder
        recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});
        recordingData = [];
        
        recorder.ondataavailable = function(event) {
          if (event.data.size > 0) {
            recordingData.push(event.data);
          }
        };
        
        recorder.onstop = function() {
          // Save the recording
          const blob = new Blob(recordingData, {type: 'video/webm'});
          const url = URL.createObjectURL(blob);
          
          // Store the URL in storage for later use
          chrome.storage.local.set({screenRecording: url});
          
          // Stop all tracks
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
          }
          
          mediaStream = null;
          recorder = null;
        };
        
        recorder.start();
      }).catch(error => {
        console.error('Error starting screen recording:', error);
      });
    }
  );
}

