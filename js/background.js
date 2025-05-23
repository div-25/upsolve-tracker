console.log("Upsolve Tracker: Background script loaded.");

// --- URL Parsing and Problem Detection ---
function getProblemInfo(urlString) {
  try {
    const url = new URL(urlString);
    // --- Codeforces Check ---
    // Matches URLs like:
    // - codeforces.com/problemset/problem/CONTEST_ID/PROBLEM_CODE
    // - codeforces.com/contest/CONTEST_ID/problem/PROBLEM_CODE
    // - codeforces.com/gym/GYM_ID/problem/PROBLEM_CODE
    if (url.hostname.endsWith("codeforces.com")) {
      const cfPathRegex =
        /^\/(?:problemset\/problem|contest\/\d+|gym\/\d+)\/problem\/[A-Z0-9]+/i;
      if (cfPathRegex.test(url.pathname)) {
        // Use hostname + pathname as the canonical identifier for now.
        // Removes query parameters and hash fragments.
        const canonicalUrl = url.origin + url.pathname;
        return {
          isProblemPage: true,
          platform: "CF",
          canonicalUrl: canonicalUrl,
        };
      }
    }
    // --- LeetCode Check ---
    // Matches URLs like:
    // - leetcode.com/problems/PROBLEM-NAME/
    // - leetcode.com/problems/PROBLEM-NAME/description/
    // - leetcode.com/problems/PROBLEM-NAME/submissions/
    if (url.hostname.endsWith("leetcode.com")) {
      const lcProblemRegex = /^\/problems\/([a-zA-Z0-9-]+)\/?/; // Captures the problem slug
      const match = url.pathname.match(lcProblemRegex);

      if (match && match[1]) {
        // Construct canonical URL as origin + /problems/ + slug + /
        const problemSlug = match[1];
        const canonicalUrl = `${url.origin}/problems/${problemSlug}/`;
        return {
          isProblemPage: true,
          platform: "LC",
          canonicalUrl: canonicalUrl,
        };
      }
    }
  } catch (e) {
    console.error("Upsolve Tracker: Error parsing URL:", urlString, e);
    return { isProblemPage: false };
  }
  return { isProblemPage: false };
}

// Generate a readable title from a LeetCode URL slug.
function generateTitleFromLeetcodeUrl(canonicalUrl) {
  try {
    const url = new URL(canonicalUrl);
    const pathParts = url.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[1] === "problems" && pathParts[2]) {
      const problemSlug = pathParts[2]; // Extract the slug from the URL
      const title = problemSlug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return title;
    }
  } catch (error) {
    console.error(
      "Error generating title from Leetcode URL:",
      canonicalUrl,
      error
    );
  }
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    // Safety check for tabId
    if (typeof tabId !== "number") {
      console.error(
        "Background: Invalid tabId provided to sendMessageToTab:",
        tabId
      );
      resolve(null);
      return;
    }
    console.log(
      `Background: Attempting to send message to tabId ${tabId}`,
      message
    );

    chrome.tabs.sendMessage(tabId, message, (response) => {
      // Always log whether lastError occurred
      if (chrome.runtime.lastError) {
        console.warn(
          `Background: chrome.runtime.lastError is set for tab ${tabId}: ${chrome.runtime.lastError.message}`
        );
        resolve(null); // Resolve null on error
      } else {
        // Log exactly what was received, even if undefined
        console.log(
          `Background: Raw response received from tab ${tabId}:`,
          response
        );
        console.log(`Background: Typeof response: ${typeof response}`); // Log the type explicitly
        // Resolve with the received value
        resolve(response);
      }
    });
  });
}

// --- Storage key and functions ---
const STORAGE_KEY_PROBLEMS = "upsolveProblems";

async function getAllProblems() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY_PROBLEMS);
    return data[STORAGE_KEY_PROBLEMS] || {};
  } catch (error) {
    console.error("Errro fetching problems from storage:", error);
    return {};
  }
}

async function getProblemData(canonicalUrl) {
  const problems = await getAllProblems();
  return problems[canonicalUrl] || null;
}

async function saveProblem(problemData) {
  if (!problemData || !problemData.url) {
    console.error("Cannot save problem data: Invalid data:", problemData);
    return false;
  }
  const canonicalUrl = problemData.url;
  try {
    const problems = await getAllProblems();
    const existingData = problems[canonicalUrl] || {};
    problems[canonicalUrl] = {
      ...existingData,
      ...problemData,
    };

    await chrome.storage.local.set({ [STORAGE_KEY_PROBLEMS]: problems });
    console.log("Problem saved/updated:", problems[canonicalUrl]);
    return true;
  } catch (error) {
    console.error(`Error saving problem ${canonicalUrl}: `, error);
    if (error.message.includes("QUOTA_BYTES")) {
      console.warn("Storage quota might be exceeded.");
    }
    return false;
  }
}

async function removeProblem(canonicalUrl) {
  try {
    const problems = await getAllProblems();
    if (problems[canonicalUrl]) {
      delete problems[canonicalUrl];
      await chrome.storage.local.set({ [STORAGE_KEY_PROBLEMS]: problems });
      console.log("Problem removed:", canonicalUrl);
      return true;
    } else {
      console.warn("Problem not found, cannot remove:", canonicalUrl);
      return false;
    }
  } catch (error) {
    console.error(`Error removing problem ${canonicalUrl}: `, error);
    return false;
  }
}

// --- Icon Update Logic ---
const ICONS = {
  DEFAULT: {
    16: "/icons/icon-default-16.png",
    32: "/icons/icon-default-32.png",
    48: "/icons/icon-default-48.png",
    128: "/icons/icon-default-128.png",
  },
  UNSOLVED: {
    16: "/icons/icon-todo-16.png",
    32: "/icons/icon-todo-32.png",
    48: "/icons/icon-todo-48.png",
    128: "/icons/icon-todo-128.png",
  },
  SOLVED: {
    16: "/icons/icon-solved-16.png",
    32: "/icons/icon-solved-32.png",
    48: "/icons/icon-solved-48.png",
    128: "/icons/icon-solved-128.png",
  },
};

async function updateIcon(tabId, url) {
  try {
    let currentUrl = url;
    if (!currentUrl) {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url) {
        console.warn("No URL found for the current tab.");
        return;
      }
      currentUrl = tab.url;
    }

    const problemInfo = getProblemInfo(currentUrl);
    let iconPath = ICONS.DEFAULT;
    if (problemInfo.isProblemPage) {
      const problemData = await getProblemData(problemInfo.canonicalUrl);
      if (problemData) {
        if (problemData.status === "Unsolved") {
          iconPath = ICONS.UNSOLVED;
        }
        if (problemData.status === "Solved") {
          iconPath = ICONS.SOLVED;
        }
        // Unexpected state is equivalent to default.
      }
      // If problem is not tracked, it remains default.
    }

    await chrome.action.setIcon({ tabId: tabId, path: iconPath });
  } catch (error) {
    if (error.message.includes("Invalid tab ID")) {
      console.warn("Invalid tab ID:", tabId);
    } else {
      console.error(`Error updating icon for tab ${tabId}: `, error);
    }
  }
}

// --- Event Listener for Icon Click ---
chrome.action.onClicked.addListener(async (tab) => {
  // Ignore clicks on pages without a URL
  // TODO: Maybe show a popup or notification instead?
  if (!tab.url || !tab.id) {
    console.warn("No URL found in the current tab.");
    return;
  }

  const problemInfo = getProblemInfo(tab.url);
  if (!problemInfo.isProblemPage) {
    // TODO: Maybe open list.html here.
    console.log("Not a recognized problem page. Doing nothing. URL: ", tab.url);
    return;
  }

  const { platform, canonicalUrl } = problemInfo;
  const tabId = tab.id;

  try {
    const currentProblemData = await getProblemData(canonicalUrl);
    const now = new Date().toISOString();
    if (currentProblemData == null) {
      // State: Not Tracked -> Add as Unsolved
      console.log("Adding new problem to storage.");

      let scrapedTitle = null;
      let scrapedTags = [];

      try {
        // Send message to content script to get details.
        const response = await sendMessageToTab(tabId, {
          type: "GET_PROBLEM_DETAILS",
        });
        if (response) {
          scrapedTitle = response.title || null;
          scrapedTags = response.tags || [];
        } else {
          console.warn("Background: response is null or falsy.");
        }
      } catch (error) {
        console.error("Error sending message to content script:", error);
      }

      let problemTitle = scrapedTitle || canonicalUrl; // Default placeholder
      if (!scrapedTitle && platform === "LC") {
        problemTitle = generateTitleFromLeetcodeUrl(canonicalUrl);
      }

      const newProblem = {
        url: canonicalUrl,
        platform: platform,
        title: problemTitle,
        tags: scrapedTags,
        status: "Unsolved",
        dateAdded: now,
        dateSolved: null,
      };
      await saveProblem(newProblem);
      console.log("Problem added:", newProblem);
    } else if (currentProblemData.status === "Unsolved") {
      // State: Unsolved -> Mark as Solved
      console.log("Marking problem as solved.");
      const updatedProblem = {
        ...currentProblemData,
        status: "Solved",
        dateSolved: now,
      };
      await saveProblem(updatedProblem);
      console.log("Problem updated:", updatedProblem);
    } else if (currentProblemData.status === "Solved") {
      // State: Solved -> Remove from tracker
      console.log("Problem is solved. Now removing from tracker!");
      await removeProblem(canonicalUrl);
      console.log("Problem removed from tracker.", canonicalUrl);
    } else {
      // Should not reach here.
      console.warn("Problem state is unknown:", currentProblemData);
    }

    await updateIcon(tab.id, canonicalUrl);
  } catch (error) {
    console.error("Error processing icon click action:", error);
  }
});

// --- Event Listener for Tab Updates ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tabId, tab.url);
    updateIcon(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateIcon(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error(
      `Error getting tab info for activated tab ${activeInfo.tabId}:`,
      error
    );
  }
});

// --- Add Listener for Storage Changes ---
// This handles cases where data might change due to sync from another browser instance.
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "sync" && changes[STORAGE_KEY_PROBLEMS]) {
    console.log("Storage changed, checking active tab icon.");
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab && activeTab.id && activeTab.url) {
        // Re-run updateIcon for the active tab to reflect potential changes
        updateIcon(activeTab.id, activeTab.url);
      }
    } catch (error) {
      console.error("Error updating icon on storage change:", error);
    }
  }
});

// -- Context Menu Setup --
const CONTEXT_MENU_ID = "viewUpsolveList";

// Use chrome.runtime.onInstalled to create the context menu
// This runs when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "View Upsolve List",
    contexts: ["action"], // Show context menu only on the browser action icon
  });
  console.log("Upsolve Tracker: Context menu created.");
});

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    console.log("Upsolve Tracker: Context menu clicked.");

    // Construct the URL for the list page
    const listPageUrl = chrome.runtime.getURL("html/list.html");
    // Check if a tab with this URL is already open
    chrome.tabs.query({ url: listPageUrl }, (tabs) => {
      if (tabs.length > 0) {
        // If the tab is already open, focus it and the window.
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: listPageUrl });
      }
    });
  }
});
