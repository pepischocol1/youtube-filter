// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateFilters') {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        return;
      }
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: 'updateFilters', settings: message.settings }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn(`Error sending message to tab ${tab.id}:`, chrome.runtime.lastError);
          } else {
            console.log(`Settings updated in tab ${tab.id}`);
          }
        });
      });
    });
  }
});