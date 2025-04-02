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

// --- Storage key and functions ---
const STORAGE_KEY_PROBLEMS = "upsolveProblems";

async function getAllProblems() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY_PROBLEMS);
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

    await chrome.storage.sync.set({ [STORAGE_KEY_PROBLEMS]: problems });
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
      await chrome.storage.sync.set({ [STORAGE_KEY_PROBLEMS]: problems });
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

// --- Event Listener for Icon Click ---
chrome.action.onClicked.addListener(async (tab) => {
  // Ignore clicks on pages without a URL
  // TODO: Maybe show a popup or notification instead?
  if (!tab.url) {
    console.warn("No URL found in the current tab.");
    return;
  }

  console.log("Upsolve Tracker: Icon clicked on tab:", tab.id, tab.url);

  const problemInfo = getProblemInfo(tab.url);
  if (!problemInfo.isProblemPage) {
    // TODO: Maybe open list.html here.
    console.log("Not a recognized problem page. Doing nothing. URL: ", tab.url);
    return;
  }

  const { platform, canonicalUrl } = problemInfo;
  console.log(
    `Upsolve Tracker processing action for: ${platform} - ${canonicalUrl}`
  );

  try {
    const currentProblemData = await getProblemData(canonicalUrl);
    const now = new Date().toISOString();
    if (currentProblemData == null) {
      // State: Not Tracked -> Add as Unsolved
      console.log("Adding new problem to storage.");
      const newProblem = {
        url: canonicalUrl,
        platform: platform,
        // TODO: Scrape title and tags.
        title: canonicalUrl,
        tags: [],
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

    // TODO: Update icon based on state!
  } catch (error) {
    console.error("Error processing icon click action:", error);
  }
});
