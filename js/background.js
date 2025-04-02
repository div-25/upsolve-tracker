console.log("Upsolve Tracker: Background script loaded.");

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
