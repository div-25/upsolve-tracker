console.log("Upsolve Tracker: List view script loaded.");

// Storage key must match the one used in background.js
const STORAGE_KEY_PROBLEMS = "upsolveProblems";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  // TODO: Fetch problems from chrome.storage.sync
  // TODO: Render the problem list into #problem-list-container
  loadProblems(); // Call function to load problems (to be implemented next)
});

async function loadProblems() {
  console.log("Attempting to load problems...");

  const tableBody = document.getElementById("problems-table-body");
  if (!tableBody) {
    console.error("Could not find #problems-table-body");
    return;
  }

  // Clear current content (loading message or previous data)
  tableBody.innerHTML = "";

  try {
    // Fetch the entire problem map object from storage
    const data = await chrome.storage.sync.get(STORAGE_KEY_PROBLEMS);
    const problemsMap = data[STORAGE_KEY_PROBLEMS] || {};
    const problemsArray = Object.values(problemsMap); // Convert object to array

    console.log(`Found ${problemsArray.length} problems in storage.`);

    if (problemsArray.length === 0) {
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6; // Span across all columns
      cell.textContent = "You haven't tracked any problems yet!";
      cell.classList.add("no-problems-message");
    } else {
      // Sort problems by date added (most recent first) by default
      problemsArray.sort(
        (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
      );
      problemsArray.forEach((problem) => {
        const row = createProblemRow(problem);
        tableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error loading problems from storage:", error);
    e;
    tableBody.innerHTML = ""; // Clear previous content
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = "Error loading problems. See console for details.";
    cell.classList.add("error-message");
  }
}

function createProblemRow(problemData) {
  const row = document.createElement("tr");
  row.classList.add(
    problemData.status === "Solved" ? "status-solved" : "status-unsolved"
  );

  // 1. Status
  const statusCell = row.insertCell();
  statusCell.innerHTML = `<span class="status-indicator">${problemData.status}</span>`;

  // 2. Title (as link)
  const titleCell = row.insertCell();
  const titleLink = document.createElement("a");
  titleLink.href = problemData.url;
  titleLink.textContent = problemData.title || problemData.url; // Use URL as fallback title
  titleLink.target = "_blank"; // Open link in new tab
  titleLink.rel = "noopener noreferrer"; // Security best practice
  titleCell.appendChild(titleLink);

  // 3. Platform
  const platformCell = row.insertCell();
  platformCell.textContent = problemData.platform || "N/A";

  // 4. Tags
  const tagsCell = row.insertCell();
  tagsCell.classList.add("tags-list");
  if (problemData.tags && problemData.tags.length > 0) {
    problemData.tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tagsCell.appendChild(tagElement);
    });
  } else {
    tagsCell.textContent = " "; // Empty or 'No tags'
  }

  // 5. Date Added
  const dateAddedCell = row.insertCell();
  try {
    dateAddedCell.textContent = problemData.dateAdded
      ? new Date(problemData.dateAdded).toLocaleDateString()
      : "N/A";
  } catch (e) {
    dateAddedCell.textContent = "Invalid Date";
  }

  // 6. Date Solved
  const dateSolvedCell = row.insertCell();
  try {
    dateSolvedCell.textContent = problemData.dateSolved
      ? new Date(problemData.dateSolved).toLocaleDateString()
      : " "; // Empty if not solved
  } catch (e) {
    dateSolvedCell.textContent = "Invalid Date";
  }

  return row;
}
