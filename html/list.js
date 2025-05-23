// html/list.js
console.log("Upsolve Tracker: List view script loaded.");

// Storage key must match the one used in background.js
const STORAGE_KEY_PROBLEMS = "upsolveProblems";

// --- DOM Element References (Ensure these IDs exist in your list.html) ---
const problemGridContainer = document.getElementById("problem-grid-container");
const totalProblemsCountEl = document.getElementById("total-problems-count");
const filterStatusPills = document.querySelectorAll(
  ".filter-pills-wrapper .filter-pill"
); // For status pills
const platformFilterButton = document.getElementById("platform-filter-button"); // Button that shows current platform
const selectedPlatformText = document.getElementById("selected-platform-text"); // The span in the button
const platformCustomDropdown = document.getElementById(
  "platform-custom-dropdown"
); // The div for options
const searchInput = document.getElementById("search-input"); // For search later

// --- Global Data Store ---
let problemsData = []; // Holds the raw data fetched from storage (all problems)
let currentFilters = {
  // To store current filter state
  status: "all",
  platform: "all",
  // tag: 'all', // We'll handle tag filtering differently if not using a select for it
  search: "",
};

// -- Platform Options Data --
const platformOptions = [
  { value: "all", text: "All Platforms" },
  { value: "CF", text: "Codeforces" },
  { value: "LC", text: "LeetCode" },
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  if (
    !problemGridContainer ||
    !totalProblemsCountEl ||
    filterStatusPills.length === 0 ||
    !platformFilterButton ||
    !platformFilterButton ||
    !platformCustomDropdown ||
    !searchInput
  ) {
    console.error(
      "One or more essential DOM elements for filtering/display are not found! Check IDs."
    );
    // Display a critical error message to the user on the page
    if (problemGridContainer) {
      problemGridContainer.innerHTML =
        '<p class="grid-placeholder-message critical-error">Error: UI elements missing. Cannot load problems.</p>';
    }
    return;
  }

  populatePlatformDropdown(); // Populate the custom dropdown first
  initializeFilters();
  loadAndDisplayProblems();
});

/**
 * Populates the custom platform dropdown with options.
 */
function populatePlatformDropdown() {
  if (!platformCustomDropdown) return;
  platformCustomDropdown.innerHTML = ""; // Clear any existing options

  platformOptions.forEach((opt) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "custom-option";
    optionDiv.dataset.value = opt.value; // Store value in data attribute
    optionDiv.textContent = opt.text;

    if (opt.value === currentFilters.platform) {
      // Highlight the initially selected/default
      optionDiv.classList.add("selected");
    }

    optionDiv.addEventListener("click", () => {
      // Update filter state
      currentFilters.platform = opt.value;
      // Update button text
      selectedPlatformText.textContent = opt.text;
      // Hide dropdown
      platformCustomDropdown.classList.remove("open");
      platformFilterButton.classList.remove("dropdown-open"); // Also update button state

      // Remove 'selected' class from all options and add to the clicked one
      platformCustomDropdown
        .querySelectorAll(".custom-option")
        .forEach((el) => el.classList.remove("selected"));
      optionDiv.classList.add("selected");

      // Apply filters and re-render
      applyFiltersAndRender();
    });
    platformCustomDropdown.appendChild(optionDiv);
  });
  console.log("Custom platform dropdown populated.");
}

// function populateTagFilter(problems) {
//   // TODO: Adapt for the new UI if we use a tag filter dropdown/pills
// }

function applyFiltersAndRender() {
  console.log(
    `Applying filters: Status='${currentFilters.status}', Platform='${currentFilters.platform}'`
  );
  const searchTerm = currentFilters.search;
  const filteredProblems = problemsData.filter((problem) => {
    const statusMatch =
      currentFilters.status === "all" ||
      problem.status === currentFilters.status;
    const platformMatch =
      currentFilters.platform === "all" ||
      problem.platform === currentFilters.platform;
    let searchMatch = true;
    if (searchTerm) {
      const problemTitle = (problem.title || "").toLowerCase();
      const problemTags = (problem.tags || []).join(" ").toLowerCase();
      searchMatch =
        problemTitle.includes(searchTerm) || problemTags.includes(searchTerm);
    }
    return statusMatch && platformMatch && searchMatch;
  });
  renderProblemList(filteredProblems);
}

function renderProblemList(problemsToRender) {
  if (!problemGridContainer) return;
  problemGridContainer.innerHTML = "";
  console.log(`Rendering ${problemsToRender.length} problems as cards.`);
  if (totalProblemsCountEl) {
    const filtersActive =
      currentFilters.status !== "all" ||
      currentFilters.platform !== "all" ||
      currentFilters.search !== "";
    if (filtersActive && problemsData.length !== problemsToRender.length) {
      totalProblemsCountEl.textContent = `Showing ${problemsToRender.length} of ${problemsData.length} Problems`;
    } else {
      totalProblemsCountEl.textContent = `Total Problems: ${problemsData.length}`;
    }
  }
  if (problemsToRender.length === 0) {
    const message =
      problemsData.length > 0
        ? "No problems match the current filters. 😕"
        : "You haven't tracked any problems yet! Add some. ✨";
    renderMessage(message);
  } else {
    problemsToRender.sort(
      (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
    );
    problemsToRender.forEach((problem) => {
      const card = createProblemCard(problem);
      problemGridContainer.appendChild(card);
    });
  }
}

function createProblemCard(problemData) {
  const card = document.createElement("div");
  card.className = "problem-card";
  card.addEventListener("click", () => {
    window.open(problemData.url, "_blank");
  });

  const imagePlaceholder = document.createElement("div");
  imagePlaceholder.className = "card-image-placeholder";
  if (problemData.platform === "CF") {
    imagePlaceholder.classList.add("platform-cf");
  } else if (problemData.platform === "LC") {
    imagePlaceholder.classList.add("platform-lc");
  }

  const cardInfo = document.createElement("div");
  cardInfo.className = "card-info";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = problemData.title || problemData.url;
  title.title = problemData.title || problemData.url;

  const dateAdded = document.createElement("p");
  dateAdded.className = "card-date";
  try {
    dateAdded.textContent = problemData.dateAdded
      ? `Added: ${new Date(problemData.dateAdded).toLocaleDateString()}`
      : "Added: N/A";
  } catch (e) {
    dateAdded.textContent = "Added: Invalid Date";
  }

  const tagsContainer = document.createElement("div");
  tagsContainer.className = "card-tags";
  if (problemData.tags && problemData.tags.length > 0) {
    problemData.tags.slice(0, 3).forEach((tagText) => {
      const tagEl = document.createElement("span");
      tagEl.className = "tag";
      tagEl.textContent = tagText;
      tagsContainer.appendChild(tagEl);
    });
    if (problemData.tags.length > 3) {
      const moreTagsEl = document.createElement("span");
      moreTagsEl.className = "tag more-tags"; // Style this class if needed
      moreTagsEl.textContent = `+${problemData.tags.length - 3}`;
      tagsContainer.appendChild(moreTagsEl);
    }
  }

  const statusText = document.createElement("p");
  statusText.className = "card-status";
  if (problemData.status === "Solved") {
    statusText.classList.add("status-solved");
    statusText.textContent = "Status: Solved ✅";
  } else {
    statusText.classList.add("status-unsolved");
    statusText.textContent = "Status: Pending ⏳";
  }

  cardInfo.appendChild(title);
  cardInfo.appendChild(dateAdded);
  if (tagsContainer.hasChildNodes()) {
    cardInfo.appendChild(tagsContainer);
  }
  cardInfo.appendChild(statusText);

  card.appendChild(imagePlaceholder);
  card.appendChild(cardInfo);

  return card;
}

function setLoadingState(isLoading) {
  if (!problemGridContainer) return;
  if (isLoading) {
    problemGridContainer.innerHTML =
      '<p class="grid-placeholder-message">Loading problems... ⏳</p>';
  }
}

function renderMessage(message, type = "message") {
  if (!problemGridContainer) return;
  problemGridContainer.innerHTML = "";
  const messageEl = document.createElement("p");
  messageEl.className = "grid-placeholder-message";
  messageEl.textContent = message;
  if (type === "error") {
    messageEl.classList.add("error-text-style");
  }
  problemGridContainer.appendChild(messageEl);
}
function initializeFilters() {
  // Status Pills
  filterStatusPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterStatusPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilters.status = pill.dataset.status;
      applyFiltersAndRender();
    });
  });

  // Custom Platform Filter Button
  platformFilterButton.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent click from bubbling to document click listener immediately
    platformCustomDropdown.classList.toggle("open");
    platformFilterButton.classList.toggle("dropdown-open"); // Toggle button visual state
  });

  // Hide the custom dropdown if clicked outside
  document.addEventListener("click", (event) => {
    // Check if the click is outside the button AND outside the dropdown itself
    if (
      !platformFilterButton.contains(event.target) &&
      !platformCustomDropdown.contains(event.target) &&
      platformCustomDropdown.classList.contains("open")
    ) {
      platformCustomDropdown.classList.remove("open");
      platformFilterButton.classList.remove("dropdown-open");
    }
  });

  // Search Input Listener
  searchInput.addEventListener("input", (event) => {
    currentFilters.search = event.target.value.toLowerCase();
    applyFiltersAndRender();
  });

  console.log("Filter event listeners initialized.");
}

async function loadAndDisplayProblems() {
  console.log("Attempting to load problems from chrome.storage.sync...");
  setLoadingState(true);
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY_PROBLEMS);
    const problemsMap = data[STORAGE_KEY_PROBLEMS] || {};
    problemsData = Object.values(problemsMap);
    console.log(`Found ${problemsData.length} raw problems in storage.`);
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading problems from storage:", error);
    renderMessage("Error loading problems. See console for details.", "error");
  } finally {
    setLoadingState(false);
  }
}
