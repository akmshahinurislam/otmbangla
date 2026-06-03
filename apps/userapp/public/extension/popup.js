// State Variables
let activeTabContent = "";
let activeTabUrl = "";
let activeTabTitle = "";
let chatHistory = [];
let backendUrl = "http://localhost:3004";

// UI Elements
const statusText = document.getElementById("status-text");
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const backendInput = document.getElementById("backend-url");
const saveSettingsBtn = document.getElementById("settings-save");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send");
const quickActions = document.getElementById("quick-actions");

// Initialize Extension Popup
document.addEventListener("DOMContentLoaded", async () => {
  // Load configuration
  const storedConfig = await chrome.storage.local.get(["backendUrl"]);
  if (storedConfig.backendUrl) {
    backendUrl = storedConfig.backendUrl;
  }
  backendInput.value = backendUrl;

  // Set up Event Listeners
  settingsToggle.addEventListener("click", toggleSettings);
  saveSettingsBtn.addEventListener("click", saveSettings);
  chatSendBtn.addEventListener("click", handleSend);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Enable/disable send button based on text input
  chatInput.addEventListener("input", () => {
    chatSendBtn.disabled = !chatInput.value.trim() || !activeTabContent;
  });

  // Setup quick action tags
  document.querySelectorAll(".action-tag").forEach(button => {
    button.addEventListener("click", () => {
      const promptText = button.getAttribute("data-prompt");
      if (promptText && activeTabContent) {
        sendMessage(promptText);
      }
    });
  });

  // Analyze active tab
  await scanActiveTab();
});

// Toggle Settings Panel
function toggleSettings() {
  settingsPanel.classList.toggle("collapsed");
}

// Save Settings
async function saveSettings() {
  const url = backendInput.value.trim();
  if (url) {
    backendUrl = url;
    await chrome.storage.local.set({ backendUrl });
    addSystemMessage("API host updated. Reconnecting...");
    toggleSettings();
    await verifyBackendConnection();
  }
}

// Scan Current Tab Content
async function scanActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showScanError("No active tab found.");
      return;
    }

    activeTabUrl = tab.url || "";
    activeTabTitle = tab.title || "Active Page";

    // Ignore Chrome system pages
    if (activeTabUrl.startsWith("chrome://") || activeTabUrl.startsWith("chrome-extension://") || activeTabUrl.startsWith("about:")) {
      showScanError("System page blocked.", "Hello! I can't access this tab's content. Browser security prevents reading system pages (like `chrome://`) or extension stores.");
      return;
    }

    // Limit to eprocure.gov.bd and its subpages
    if (!activeTabUrl.startsWith("https://www.eprocure.gov.bd/")) {
      showScanError("Restricted website.", "This AI Companion is configured to run exclusively on the Bangladesh National e-GP portal (**https://www.eprocure.gov.bd**). Please open an e-GP page to start scanning.");
      return;
    }

    statusText.textContent = "Scanning content...";

    // Inject scripting to fetch outer text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Retrieve body/document inner text
        return document.body ? document.body.innerText : document.documentElement.innerText;
      }
    });

    const text = results[0]?.result || "";
    if (!text.trim()) {
      showScanError("No text content found.", "No readable text content was detected on this e-GP portal page.");
      return;
    }

    activeTabContent = text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    // UI updates
    statusText.textContent = `Analyzed ${wordCount.toLocaleString()} words`;
    statusText.className = "status-badge success";
    chatInput.disabled = false;
    
    // Load existing history for this page
    await loadHistoryForPage();

    // Verify backend connection
    await verifyBackendConnection();

  } catch (error) {
    console.error("Scanning failed:", error);
    showScanError("Permission denied.", "Failed to scan page. Please check that the extension has host permissions and the page has finished loading.");
  }
}

function showScanError(msg, detailMsg) {
  statusText.textContent = msg;
  statusText.className = "status-badge error";
  chatInput.disabled = true;
  chatInput.placeholder = "Context restricted.";
  chatSendBtn.disabled = true;
  quickActions.style.pointerEvents = "none";
  quickActions.style.opacity = "0.5";
  
  // Greet with error
  addMessage("ai", detailMsg || `Hello! I can't access this tab's content. Please try opening a standard website!`);
}

// Verify backend connection
async function verifyBackendConnection() {
  try {
    const res = await fetch(`${backendUrl}/health`);
    if (res.ok) {
      console.log("Connected to backend successfully.");
    } else {
      addSystemMessage("Warning: AI backend returned non-OK status.");
    }
  } catch (error) {
    console.warn("Backend offline:", error);
    addSystemMessage(`Warning: Backend at "${backendUrl}" is offline. Please make sure your AI Service is running.`);
  }
}

// Load Chat history keyed by URL
async function loadHistoryForPage() {
  chatMessages.innerHTML = "";
  
  const key = `chat_${activeTabUrl}`;
  const stored = await chrome.storage.local.get([key]);
  
  if (stored[key] && stored[key].length > 0) {
    chatHistory = stored[key];
    chatHistory.forEach(msg => {
      addMessage(msg.role, msg.content, false);
    });
  } else {
    // Clear and add greeting
    chatHistory = [];
    const greetMsg = `Hello! I've scanned **"${activeTabTitle}"**. Ask me anything about the content of this page!`;
    addMessage("ai", greetMsg, false);
  }
  scrollToBottom();
}

// Handle message sending
async function handleSend() {
  const query = chatInput.value.trim();
  if (!query) return;

  chatInput.value = "";
  chatSendBtn.disabled = true;
  sendMessage(query);
}

// Send user message and fetch AI reply
async function sendMessage(text) {
  // Append User message
  addMessage("user", text);
  chatHistory.push({ role: "user", content: text });
  await saveHistory();

  // Create loading placeholder
  const loadDiv = document.createElement("div");
  loadDiv.className = "message ai";
  loadDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(loadDiv);
  scrollToBottom();

  try {
    const cleanHistory = chatHistory.slice(0, -1); // Exclude the message we just sent from history parameter
    const response = await fetch(`${backendUrl}/api/ai/page-qa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pageContent: activeTabContent,
        question: text,
        history: cleanHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.answer || data.message || "I was unable to answer.";

    // Remove loading placeholder
    chatMessages.removeChild(loadDiv);

    // Append AI reply
    addMessage("ai", reply);
    chatHistory.push({ role: "ai", content: reply });
    await saveHistory();

  } catch (error) {
    console.error("AI QA request failed:", error);
    chatMessages.removeChild(loadDiv);
    
    const errMsg = `Error: Failed to fetch answer. Please make sure the AI service is running on **${backendUrl}** and your OpenAI key is active.`;
    addMessage("ai", errMsg);
  }

  chatInput.focus();
}

// Save chat history to storage
async function saveHistory() {
  const key = `chat_${activeTabUrl}`;
  await chrome.storage.local.set({ [key]: chatHistory.slice(-20) }); // Save last 20 messages
}

// Render message in DOM
function addMessage(sender, text, animate = true) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  
  if (!animate) {
    msgDiv.style.animation = "none";
  }

  // Support basic markdown bolding (e.g. **text**)
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  msgDiv.innerHTML = formattedText;
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function addSystemMessage(text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message system";
  msgDiv.textContent = text;
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Listen for tab switching and reload pages to re-analyze automatically
chrome.tabs.onActivated.addListener(() => {
  scanActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab && activeTab.id === tabId) {
        scanActiveTab();
      }
    });
  }
});

