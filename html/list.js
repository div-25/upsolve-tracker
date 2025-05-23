// html/list.js
console.log("Upsolve Tracker: List view script loaded.");

// Storage key must match the one used in background.js
const STORAGE_KEY_PROBLEMS = "upsolveProblems";
const ITEMS_PER_PAGE = 10;

// -- Theme Variables --
const THEME_STORAGE_KEY = "upsolveTrackerTheme";
const LIGHT_THEME = "light";
const DARK_THEME = "dark";

// --- Global Data Store ---
let problemsData = []; // Holds the raw data fetched from storage (all problems)
let currentFilters = {
  // To store current filter state
  status: "all",
  platform: "all",
  // tag: 'all', // We'll handle tag filtering differently if not using a select for it
  search: "",
};
let currentPage = 1; // For pagination
let totalPages = 1; // For pagination

// -- Platform Options Data --
const platformOptions = [
  { value: "all", text: "All Platforms" },
  { value: "CF", text: "Codeforces" },
  { value: "LC", text: "LeetCode" },
];

// -- Assign DOM Element references --
const problemGridContainer = document.getElementById("problem-grid-container");
const totalProblemsCountEl = document.getElementById("total-problems-count");
const filterStatusPills = document.querySelectorAll(
  ".filter-pills-wrapper .filter-pill"
);
const platformFilterButton = document.getElementById("platform-filter-button");
const selectedPlatformText = document.getElementById("selected-platform-text");
const platformCustomDropdown = document.getElementById(
  "platform-custom-dropdown"
);
const searchInput = document.getElementById("search-input");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageInfoEl = document.getElementById("page-info");
let themeToggleButton, themeIconMoon, themeIconSun;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  // Assign theme toggle elements here specifically
  themeToggleButton = document.getElementById("theme-toggle-btn");
  themeIconMoon = document.getElementById("theme-icon-moon");
  themeIconSun = document.getElementById("theme-icon-sun");

  if (
    !problemGridContainer ||
    !totalProblemsCountEl ||
    filterStatusPills.length === 0 ||
    !platformFilterButton ||
    !selectedPlatformText ||
    !platformCustomDropdown ||
    !searchInput ||
    !prevPageBtn ||
    !nextPageBtn ||
    !pageInfoEl ||
    !themeToggleButton ||
    !themeIconMoon ||
    !themeIconSun
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

  initializeTheme(); // Initialize theme first
  initializeThemeToggle();
  populatePlatformDropdown(); // Populate the custom dropdown first
  initializeFilters();
  initializePagination();
  loadAndDisplayProblems();
});

// -- Theme Functions --
/**
 * Applies the saved theme or default (dark) on page load.
 */
async function initializeTheme() {
  let currentTheme = await getThemePreference();
  if (!currentTheme) {
    currentTheme = DARK_THEME; // Make dark theme the default
    await setThemePreference(currentTheme); // Save default if nothing was stored
  }
  applyTheme(currentTheme);
  updateThemeIcon(currentTheme);
  console.log("Theme initialized to:", currentTheme);
}

/**
 * Applies the given theme to the body and updates the toggle icon.
 * @param {string} theme - 'light' or 'dark'
 */
function applyTheme(theme) {
  if (theme === DARK_THEME) {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme"); // Just in case
  } else {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme"); // Explicitly add light-theme class if needed for overrides
  }
}

/**
 * Updates the theme toggle button icon based on the current theme.
 * @param {string} theme - 'light' or 'dark'
 */
function updateThemeIcon(theme) {
  if (!themeIconMoon || !themeIconSun) {
    console.warn("Theme icon elements not found in updateThemeIcon.");
    return;
  }
  if (theme === DARK_THEME) {
    themeIconMoon.classList.add("hidden-icon");
    themeIconSun.classList.remove("hidden-icon");
  } else {
    themeIconSun.classList.add("hidden-icon");
    themeIconMoon.classList.remove("hidden-icon");
  }
}

/**
 * Retrieves the saved theme preference from chrome.storage.local.
 * @returns {Promise<string|null>}
 */
async function getThemePreference() {
  try {
    const data = await chrome.storage.local.get(THEME_STORAGE_KEY);
    return data[THEME_STORAGE_KEY] || null;
  } catch (e) {
    console.error("Error getting theme preference:", e);
    return null;
  }
}

/**
 * Saves the theme preference to chrome.storage.local.
 * @param {string} theme - 'light' or 'dark'
 */
async function setThemePreference(theme) {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
  } catch (e) {
    console.error("Error setting theme preference:", e);
  }
}

// Modify initializeFilters to include the theme toggle listener,
// or add a new dedicated function if preferred.
function initializeThemeToggle() {
  if (!themeToggleButton) {
    console.error("Theme toggle button not found in initializeThemeToggle.");
    return;
  }
  themeToggleButton.addEventListener("click", async () => {
    console.log("Theme toggle button clicked.");
    let currentTheme = document.body.classList.contains("dark-theme")
      ? DARK_THEME
      : LIGHT_THEME;
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

    applyTheme(newTheme);
    updateThemeIcon(newTheme);
    await setThemePreference(newTheme);
    console.log("Theme toggled to:", newTheme);
  });
  console.log("Theme toggle listener initialized.");
}

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
      currentPage = 1; // Reset to first page
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

  // -- Pagination Logic ---
  totalPages = Math.max(1, Math.ceil(filteredProblems.length / ITEMS_PER_PAGE));
  // Ensure currentPage is within valid bounds
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProblems = filteredProblems.slice(startIndex, endIndex);

  renderProblemList(paginatedProblems, filteredProblems.length);
  updatePaginationControls();
}

function renderProblemList(problemsToRender, totalFilteredCount) {
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
    // problemsToRender are already sorted if problemsData was sorted, and then paginated
    // No need to sort here again unless you want per-page sorting different from global
    problemsToRender.forEach((problem) => {
      const card = createProblemCard(problem);
      problemGridContainer.appendChild(card);
    });
  }
}

function updatePaginationControls() {
  if (!pageInfoEl || !prevPageBtn || !nextPageBtn) return;

  pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

  // Hide pagination entirely if only one page and no problems (or few problems)
  const paginationSection = document.querySelector(".pagination-section");
  if (paginationSection) {
    if (totalPages <= 1 && problemsData.length <= ITEMS_PER_PAGE) {
      // Also consider total problems
      paginationSection.style.display = "none";
    } else {
      paginationSection.style.display = "flex";
    }
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
    statusText.textContent = "✅ Solved";
  } else {
    statusText.classList.add("status-unsolved");
    statusText.textContent = "⏳Pending";
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
    currentPage = 1; // Reset to first page on new search
    applyFiltersAndRender();
  });

  console.log("Filter event listeners initialized.");
}

async function loadAndDisplayProblems() {
  console.log("Attempting to load problems from chrome.storage.local...");
  setLoadingState(true);
  currentPage = 1; // Reset to first page on full load
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY_PROBLEMS);
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

function initializePagination() {
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFiltersAndRender(); // Re-render with the new page
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      applyFiltersAndRender(); // Re-render with the new page
    }
  });
  console.log("Pagination listeners initialized.");
}
