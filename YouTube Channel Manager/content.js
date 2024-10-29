// content.js
async function filterContent() {
  // Check if extension is enabled before proceeding
  const { isEnabled = false, allowedChannels = [] } = await chrome.storage.sync.get(['isEnabled', 'allowedChannels']);
  
  // If extension is disabled, return early
  if (!isEnabled) return;
  
  // Helper function to check if a channel is allowed
  function isChannelAllowed(channelUrl) {
    if (!channelUrl) return false;
    const channelMatch = channelUrl.match(/\/(channel\/|c\/|@)([^\/\?]+)/);
    return channelMatch && allowedChannels.includes(channelMatch[2]);
  }

  // Helper function to hide or remove an element
  function hideElement(element) {
    if (element) {
      element.style.display = 'none';
    }
  }

  // Filter homepage content
  function filterHomepage() {
    const videoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer');
    videoElements.forEach(element => {
      const channelElement = element.querySelector('ytd-channel-name a');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        hideElement(element);
      }
    });
  }

  // Filter search results
  function filterSearchResults() {
    const searchResults = document.querySelectorAll('ytd-video-renderer, ytd-compact-video-renderer');
    searchResults.forEach(element => {
      const channelElement = element.querySelector('ytd-channel-name a');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        hideElement(element);
      }
    });
  }

  // Filter recommended videos (sidebar and end screen)
  function filterRecommended() {
    // Sidebar recommendations
    const sidebarVideos = document.querySelectorAll('ytd-compact-video-renderer');
    sidebarVideos.forEach(element => {
      const channelElement = element.querySelector('ytd-channel-name a');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        hideElement(element);
      }
    });

    // End screen recommendations
    const endScreenVideos = document.querySelectorAll('ytd-endscreen-video-renderer');
    endScreenVideos.forEach(element => {
      const channelElement = element.querySelector('.ytd-endscreen-video-renderer a');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        hideElement(element);
      }
    });

    // Playlist recommendations
    const playlistVideos = document.querySelectorAll('ytd-playlist-panel-video-renderer');
    playlistVideos.forEach(element => {
      const channelElement = element.querySelector('#channel-name a');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        hideElement(element);
      }
    });
  }

  // Handle video page - check if current video is from allowed channel
  async function handleVideoPage() {
    const videoOwnerElement = document.querySelector('#owner #channel-name a');
    if (videoOwnerElement && !isChannelAllowed(videoOwnerElement.href)) {
      // Redirect to homepage if video is from non-allowed channel
      window.location.href = 'https://www.youtube.com';
      return;
    }
  }

  // Handle auto-play
  function disableAutoplayForNonAllowed() {
    const autoplayVideo = document.querySelector('.ytp-autonav-endscreen-upnext-container');
    if (autoplayVideo) {
      const channelElement = autoplayVideo.querySelector('a[href*="channel/"], a[href*="/c/"], a[href*="/@"]');
      if (!channelElement || !isChannelAllowed(channelElement.href)) {
        // Disable autoplay if next video is from non-allowed channel
        const autoplayToggle = document.querySelector('.ytp-autonav-toggle-button');
        if (autoplayToggle && autoplayToggle.getAttribute('aria-checked') === 'true') {
          autoplayToggle.click();
        }
      }
    }
  }

  // Filter mix playlist suggestions
  function filterMixPlaylists() {
    const mixPlaylists = document.querySelectorAll('ytd-radio-renderer');
    mixPlaylists.forEach(element => {
      hideElement(element);
    });
  }

  // Apply appropriate filters based on current page
  const currentUrl = window.location.href;
  if (currentUrl.includes('/watch')) {
    await handleVideoPage();
    filterRecommended();
    disableAutoplayForNonAllowed();
  } else if (currentUrl.includes('/results')) {
    filterSearchResults();
  } else if (currentUrl === 'https://www.youtube.com/' || currentUrl.includes('/home')) {
    filterHomepage();
    filterMixPlaylists();
  }

  // Create observer for dynamic content
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      if (currentUrl.includes('/watch')) {
        filterRecommended();
        disableAutoplayForNonAllowed();
      } else if (currentUrl.includes('/results')) {
        filterSearchResults();
      } else if (currentUrl === 'https://www.youtube.com/' || currentUrl.includes('/home')) {
        filterHomepage();
        filterMixPlaylists();
      }
    });
  });

  // Observe relevant containers
  const containers = [
    document.querySelector('ytd-rich-grid-renderer'), // Homepage
    document.querySelector('#secondary'), // Sidebar
    document.querySelector('#related'), // Related videos
    document.querySelector('#contents'), // Search results
    document.querySelector('.ytp-endscreen-content'), // End screen
    document.querySelector('ytd-watch-next-secondary-results-renderer') // Watch page recommendations
  ];

  containers.forEach(container => {
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }
  });
}

// Message listener for extension state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'stateChanged') {
    if (message.isEnabled) {
      filterContent();
    } else {
      // Reload the page to show all content when disabled
      window.location.reload();
    }
  }
});

// Run on page load
filterContent();

// Listen for YouTube's navigation events
document.addEventListener('yt-navigate-finish', filterContent);
document.addEventListener('yt-page-data-updated', filterContent);

// Additional event listener for dynamic content updates
window.addEventListener('yt-visibility-refresh', filterContent);