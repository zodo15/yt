document.addEventListener('DOMContentLoaded', async () => {
  // Get the current state and allowed channels
  const { isEnabled = false, allowedChannels = [] } = await chrome.storage.sync.get(['isEnabled', 'allowedChannels']);
  
  // Set up toggle
  const toggle = document.getElementById('extensionToggle');
  const statusText = document.getElementById('statusText');
  toggle.checked = isEnabled;
  statusText.textContent = isEnabled ? 'On' : 'Off';
  
  // Toggle handler
  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    await chrome.storage.sync.set({ isEnabled });
    statusText.textContent = isEnabled ? 'On' : 'Off';
    
    // Notify content script of state change
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'stateChanged', isEnabled });
    });
  });
  
  // Display current channels
  displayChannels(allowedChannels);
  
  // Add channel button handler
  document.getElementById('addChannel').addEventListener('click', async () => {
    const input = document.getElementById('channelInput');
    const channelId = extractChannelId(input.value);
    
    if (channelId) {
      const { allowedChannels = [] } = await chrome.storage.sync.get('allowedChannels');
      if (!allowedChannels.includes(channelId)) {
        allowedChannels.push(channelId);
        await chrome.storage.sync.set({ allowedChannels });
        displayChannels(allowedChannels);
      }
      input.value = '';
    }
  });
});

function extractChannelId(input) {
  const urlMatch = input.match(/youtube\.com\/(channel\/|c\/|@)([^\/\?]+)/);
  return urlMatch ? urlMatch[2] : input.trim();
}

function displayChannels(channels) {
  const list = document.getElementById('channelList');
  list.innerHTML = '';
  
  channels.forEach(channel => {
    const div = document.createElement('div');
    div.className = 'channel';
    div.innerHTML = `
      <span>${channel}</span>
      <button class="remove" onclick="removeChannel('${channel}')">Remove</button>
    `;
    list.appendChild(div);
  });
}

async function removeChannel(channelId) {
  const { allowedChannels = [] } = await chrome.storage.sync.get('allowedChannels');
  const updatedChannels = allowedChannels.filter(id => id !== channelId);
  await chrome.storage.sync.set({ allowedChannels: updatedChannels });
  displayChannels(updatedChannels);
}
