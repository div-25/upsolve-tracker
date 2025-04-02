console.log("Upsolve Tracker: Background script loaded.");

// Listener for the extension being installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Upsolve Tracker: Extension Installed/Updated.");
  // TODO: Setup default storage values if needed
  // TODO: Create context menu (FR5)
});

// Listener for the extension icon click (FR4)
chrome.action.onClicked.addListener((tab) => {
  console.log("Upsolve Tracker: Icon clicked on tab:", tab.id, "URL:", tab.url);
  // TODO: Implement FR1 (Platform Detection based on tab.url)
  // TODO: Implement FR4.1 (Toggle logic)
  // TODO: Implement FR4.2 (Update storage)
  // TODO: Implement FR6 (Update icon dynamically based on logic)
  // TODO: Implement FR4.3 (Handle non-problem pages)
});

// Placeholder for receiving messages from content script (if needed later)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Upsolve Tracker: Message received", message);
    // TODO: Handle messages (e.g., scraped data from content script)
});