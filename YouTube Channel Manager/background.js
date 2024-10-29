chrome.webNavigation.onHistoryStateUpdated.addListener(
  ({ tabId, url }) => {
    if (url.includes('youtube.com')) {
      chrome.scripting.executeScript({
        target: { tabId },
        function: filterContent
      });
    }
  },
  { url: [{ hostSuffix: 'youtube.com' }] }
);