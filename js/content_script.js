console.log("Upsolve Tracker: Content script loaded on:", window.location.href);

function getPlatform() {
  if (window.location.hostname.includes("codeforces.com")) {
    return "CF";
  } else if (window.location.hostname.includes("leetcode.com")) {
    return "LC";
  }
  return null;
}

function scrapeCodeforcesData() {
  let title = null;
  let tags = [];

  const titleElement = document.querySelector(
    ".problem-statement .header .title"
  );
  if (titleElement) {
    // Title often looks like "A. Problem Name". Remove the prefix.
    title = titleElement.textContent.trim().replace(/^[A-Z0-9]+\.\s*/, "");
  } else {
    console.warn("Upsolve Tracker: Could not find CF title element.");
  }

  const tagElements = document.querySelectorAll(".tag-box");
  if (tagElements.length > 0) {
    tagElements.forEach((tagE1) => {
      const tagText = tagE1.textContent.trim();
      if (tagText && !tagText.startsWith("*")) {
        tags.push(tagText);
      }
    });
  } else {
    console.warn(
      "Upsolve Tracker: Could not find CF tag elements using '.tag-box'."
    );
  }
  return { title: title, tags: tags };
}

function scrapeLeetcodeData() {
  let title = null; // Always return null for title from here. We handle this in background.js
  let tags = [];
  const tagElements = document.querySelectorAll('a[href^="/tag/"]');
  let potentialTags = new Set();

  if (tagElements.length > 0) {
    tagElements.forEach((tagLink) => {
      const tagText = tagLink.textContent.trim();
      if (tagText) {
        potentialTags.add(tagText);
      }
    });
    tags = Array.from(potentialTags);
  } else {
    console.warn(
      "Upsolve Tracker: Could not find LC tag elements using 'a[href^=\"/tag/\"]'."
    );
  }
  return { title: title, tags: tags };
}

// -- Add Message Listener --
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Upsolve Tracker: Content script received message:", message);
  if (message.type === "GET_PROBLEM_DETAILS") {
    console.log(
      "Upsolve Tracker: Content script received GET_PROBLEM_DETAILS request"
    );

    const platform = getPlatform();
    let data = { title: null, tags: [] };
    try {
      if (platform === "CF") {
        data = scrapeCodeforcesData();
      } else if (platform === "LC") {
        data = scrapeLeetcodeData();
      } else {
        console.warn("Upsolve Tracker: Unsupported platform.");
      }
    } catch (error) {
      console.error("Upsolve Tracker: Error scraping data:", error);
      data = { title: null, tags: [], error: error.message };
    }

    console.log("Upsolve Tracker: Scraped data:", data);
    sendResponse(data);

    // Indicate that the response might be sent asynchronously.
    return true;
  }
  console.warn(
    "Upsolve Tracker: Content script received unknown message type:",
    message.type
  );
  return false;
});

console.log("Upsolve Tracker: Content script message listener ready.");
