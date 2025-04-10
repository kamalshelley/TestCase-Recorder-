# TestCase Recorder 

A powerful browser extension for recording user actions and generating test cases automatically.

## Features

- **Auto-Generated Test Cases**: Records user actions and generates manual test cases automatically
- **Steps to Reproduce Bugs**: Records each user action as a step to easily reproduce bugs
- **Screenshot Capture**: Automatically captures screenshots and highlights areas where actions were performed
- **Screen Recording**: Records browser tabs, app windows, or the entire screen
- **Selector Generation**: Generates XPath and CSS selectors for each element interacted with
- **iframe Support**: Captures actions performed in iframes
- **System Information**: Records browser, OS details, screen resolution, and timestamps
- **Multilingual Support**: Record test cases in multiple languages including English, German, French, Spanish, and Chinese

## Installation

### For Development/Testing

1. Download or clone this repository
2. Open Chrome/Edge browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The TestCase Recorder extension should now appear in your browser toolbar

## Usage

1. Click on the TestCase Recorder icon in your browser toolbar
2. Configure recording options:
   - Toggle screenshot capture
   - Enable/disable screen recording
   - Choose whether to generate selectors
   - Select your preferred language
3. Click "Start Recording" to begin capturing actions
4. Perform the actions you want to record on any website
5. Click "Stop Recording" when finished
6. View, export, or copy your recorded test case

## File Structure

- `manifest.json`: Extension configuration
- `popup.html/css/js`: Extension popup interface
- `background.js`: Background service worker
- `content.js`: Content script injected into web pages
- `images/`: Icon resources

## Test Case Export Format

The exported test cases include:

- System information (browser, OS, resolution, timestamp)
- Numbered steps with detailed descriptions
- Element selectors (XPath and CSS) for each action
- Timestamps for each action

## Languages Supported

- English
- German
- French
- Spanish
- Chinese

## Development

### Adding New Languages

To add support for additional languages, edit the `translations` object in `content.js`:

```javascript
const translations = {
  'click': {
    'en': 'Click',
    'de': 'Klick',
    // Add new language here
  },
  // ...
};
```

### Adding New Action Types

To record additional types of user actions, add new event listeners in `setupEventListeners()` in `content.js`.

## License

This project is licensed under the MIT License.