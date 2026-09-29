let stories = [];
let savedStoryIds = [];
let currentStory = null;
let currentFontSize = 19;
let currentUser = null;


/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {

  loadStories();
  checkUser();

  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearch);

  document
    .getElementById("accountBtn")
    .addEventListener("click", openAccount);

  document
    .getElementById("promoAccountBtn")
    .addEventListener("click", openAccount);

  document
    .getElementById("libraryBtn")
    .addEventListener("click", openLibrary);

  document
    .getElementById("accountLibraryBtn")
    .addEventListener("click", () => {
      closeModal("authModal");
      openLibrary();
    });

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);

  document
    .getElementById("loginSubmit")
    .addEventListener("click", login);

  document
    .getElementById("signupSubmit")
    .addEventListener("click", signup);

  document
    .getElementById("loginTab")
    .addEventListener("click", showLogin);

  document
    .getElementById("signupTab")
    .addEventListener("click", showSignup);

  document
    .getElementById("closeReader")
    .addEventListener("click", closeReader);

  document
    .getElementById("fontDown")
    .addEventListener("click", decreaseFont);

  document
    .getElementById("fontUp")
    .addEventListener("click", increaseFont);

  document
    .getElementById("saveReaderBtn")
    .addEventListener("click", saveCurrentStory);

  document
    .getElementById("browseBtn")
    .addEventListener("click", () => {
      document
        .getElementById("featuredSection")
        .scrollIntoView();
    });


  document
    .querySelectorAll(".genre-card")
    .forEach(button => {

      button.addEventListener("click", () => {

        const genre = button.dataset.genre;

        filterGenre(genre);

      });

    });


  document
    .querySelectorAll("[data-close]")
    .forEach(button => {

      button.addEventListener("click", () => {
        closeModal(button.dataset.close);
      });

    });

});


/* =========================
   LOAD STORIES
========================= */

async function loadStories() {

  try {

    const response = await fetch("/api/stories");

    if (!response.ok) {
      throw new Error("Could not load stories");
    }

    stories = await response.json();

    stories = stories.filter(
      story =>
        String(story.title || "").toLowerCase() !==
        "epshitah 2026"
    );

    renderFeatured();
    renderGenres();

    if (currentUser) {
      loadSavedStories();
    }

  } catch (error) {

    console.error(error);

    document.getElementById("featuredStories").innerHTML =
      `<div class="empty">Stories could not be loaded.</div>`;

  }

}


/* =========================
   STORY CARDS
========================= */

function renderFeatured() {

  const container =
    document.getElementById("featuredStories");

  if (!stories.length) {

    container.innerHTML =
      `<div class="empty">No stories have been added yet.</div>`;

    return;
  }

  container.innerHTML =
    stories
      .slice(0, 8)
      .map(storyCard)
      .join("");

}


function renderGenres() {

  const container =
    document.getElementById("genreSections");

  const genres = [
    "Romance",
    "Drama",
    "Heartbreak",
    "Thriller",
    "Mystery",
    "Life Stories"
  ];

  container.innerHTML = "";

  genres.forEach(genre => {

    const matching =
      stories.filter(story =>
        normalizeCategory(story.category) ===
        normalizeCategory(genre)
      );

    if (!matching.length) return;

    const section =
      document.createElement("section");

    section.className = "section";

    section.innerHTML = `
      <div class="section-title">
        <h2>${escapeHtml(genre)}</h2>
        <p>Stories in ${escapeHtml(genre)}</p>
      </div>

      <div class="story-grid">
        ${matching.map(storyCard).join("")}
      </div>
    `;

    container.appendChild(section);

  });

}


function storyCard(story) {

  const saved =
    savedStoryIds.includes(Number(story.id));

  return `

    <div class="story-card">

      <div class="story-cover">

        <span>
          ${escapeHtml(
            story.category || "Story"
          )}
        </span>

      </div>

      <div class="story-body">

        <h3>
          ${escapeHtml(story.title)}
        </h3>

        <p>
          ${escapeHtml(
            story.description ||
            "A story waiting to be discovered."
          )}
        </p>

        <div class="story-actions">

          <button
            class="read-btn"
            onclick="openStory(${Number(story.id)})"
          >
            📖 Read
          </button>

          <button
            class="save-btn"
            onclick="toggleSave(${Number(story.id)})"
          >
            ${saved ? "❤️" : "♡"}
          </button>

        </div>

      </div>

    </div>

  `;

}


/* =========================
   READ STORY
========================= */

function openStory(id) {

  const story =
    stories.find(item => Number(item.id) === Number(id));

  if (!story) return;

  currentStory = story;

  document.getElementById("readerCategory").textContent =
    story.category || "Story";

  document.getElementById("readerTitle").textContent =
    story.title;

  document.getElementById("readerDescription").textContent =
    story.description || "";

  document.getElementById("readerContent").textContent =
    story.content || "";

  updateSaveButton();

  document
    .getElementById("readerModal")
    .classList.remove("hidden");

  document.body.style.overflow = "hidden";

  window.scrollTo(0, 0);

}


function closeReader() {

  document
    .getElementById("readerModal")
    .classList.add("hidden");

  document.body.style.overflow = "";

}


/* =========================
   FONT SIZE
========================= */

function increaseFont() {

  currentFontSize += 2;

  if (currentFontSize > 28) {
    currentFontSize = 28;
  }

  document
    .getElementById("readerContent")
    .style.fontSize =
    currentFontSize + "px";

}


function decreaseFont() {

  currentFontSize -= 2;

  if (currentFontSize < 15) {
    currentFontSize = 15;
  }

  document
    .getElementById("readerContent")
    .style.fontSize =
    currentFontSize + "px";

}


/* =========================
   USER
========================= */

async function checkUser() {

  try {

    const response =
      await fetch("/api/me", {
        credentials: "same-origin"
      });

    const data =
      await response.json();

    if (data.loggedIn) {

      currentUser = data.user;

      await loadSavedStories();

      updateAccountUI();

    }

  } catch (error) {

    console.error(error);

  }

}


function updateAccountUI() {

  const accountBtn =
    document.getElementById("accountBtn");

  const libraryBtn =
    document.getElementById("libraryBtn");

  accountBtn.textContent =
    "👤 " + currentUser.name;

  libraryBtn.classList.remove("hidden");

  document
    .getElementById("accountName")
    .textContent =
    currentUser.name;

  document
    .getElementById("accountEmail")
    .textContent =
    currentUser.email;

  document
    .getElementById("loginForm")
    .classList.add("hidden");

  document
    .getElementById("signupForm")
    .classList.add("hidden");

  document
    .getElementById("authTabs")
    .classList.add("hidden");

  document
    .getElementById("loggedAccount")
    .classList.remove("hidden");

}


/* =========================
   AUTH MODAL
========================= */

function openAccount() {

  document
    .getElementById("authModal")
    .classList.remove("hidden");

  if (currentUser) {

    updateAccountUI();

  } else {

    showLogin();

  }

}


function showLogin() {

  document
    .getElementById("loginForm")
    .classList.remove("hidden");

  document
    .getElementById("signupForm")
    .classList.add("hidden");

  document
    .getElementById("loggedAccount")
    .classList.add("hidden");

  document
    .getElementById("authTabs")
    .classList.remove("hidden");

  document
    .getElementById("loginTab")
    .classList.add("active");

  document
    .getElementById("signupTab")
    .classList.remove("active");

}


function showSignup() {

  document
    .getElementById("loginForm")
    .classList.add("hidden");

  document
    .getElementById("signupForm")
    .classList.remove("hidden");

  document
    .getElementById("loggedAccount")
    .classList.add("hidden");

  document
    .getElementById("authTabs")
    .classList.remove("hidden");

  document
    .getElementById("signupTab")
    .classList.add("active");

  document
    .getElementById("loginTab")
    .classList.remove("active");

}


async function login() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");

  message.textContent = "Logging in...";

  try {

    const response =
      await fetch("/api/login", {

        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })

      });

    const data =
      await response.json();

    if (!response.ok) {

      message.textContent =
        data.message || "Login failed.";

      return;
    }

    currentUser = data.user;

    await loadSavedStories();

    updateAccountUI();

    message.textContent = "";

  } catch (error) {

    message.textContent =
      "Could not connect to the server.";

  }

}


async function signup() {

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  const message =
    document.getElementById("signupMessage");

  message.textContent =
    "Creating your account...";

  try {

    const response =
      await fetch("/api/signup", {

        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name,
          email,
          password
        })

      });

    const data =
      await response.json();

    if (!response.ok) {

      message.textContent =
        data.message || "Could not create account.";

      return;
    }

    currentUser = data.user;

    await loadSavedStories();

    updateAccountUI();

    message.textContent = "";

  } catch (error) {

    message.textContent =
      "Could not connect to the server.";

  }

}


async function logout() {

  await fetch("/api/logout", {
    method: "POST",
    credentials: "same-origin"
  });

  currentUser = null;
  savedStoryIds = [];

  document
    .getElementById("libraryBtn")
    .classList.add("hidden");

  document
    .getElementById("accountBtn")
    .textContent =
    "👤 Log In";

  closeModal("authModal");

  renderFeatured();
  renderGenres();

}


/* =========================
   SAVED STORIES
========================= */

async function loadSavedStories() {

  if (!currentUser) return;

  try {

    const response =
      await fetch("/api/saved-stories", {
        credentials: "same-origin"
      });

    if (!response.ok) return;

    const data =
      await response.json();

    savedStoryIds =
      data.map(story => Number(story.id));

    renderFeatured();
    renderGenres();

  } catch (error) {

    console.error(error);

  }

}


async function toggleSave(id) {

  if (!currentUser) {

    openAccount();

    return;
  }

  const saved =
    savedStoryIds.includes(Number(id));

  try {

    const response =
      await fetch(
        "/api/saved-stories/" + id,
        {
          method: saved ? "DELETE" : "POST",
          credentials: "same-origin"
        }
      );

    if (!response.ok) {

      const data = await response.json();

      alert(data.message || "Could not save story.");

      return;
    }

    if (saved) {

      savedStoryIds =
        savedStoryIds.filter(
          storyId => storyId !== Number(id)
        );

    } else {

      savedStoryIds.push(Number(id));

    }

    renderFeatured();
    renderGenres();

    updateSaveButton();

  } catch (error) {

    alert("Could not connect to the server.");

  }

}


async function saveCurrentStory() {

  if (!currentStory) return;

  await toggleSave(currentStory.id);

}


function updateSaveButton() {

  if (!currentStory) return;

  const button =
    document.getElementById("saveReaderBtn");

  const saved =
    savedStoryIds.includes(
      Number(currentStory.id)
    );

  button.textContent =
    saved ? "❤️ Saved" : "♡ Save";

}


/* =========================
   LIBRARY
========================= */

async function openLibrary() {

  if (!currentUser) {

    openAccount();

    return;
  }

  await loadSavedStories();

  const container =
    document.getElementById("libraryStories");

  const saved =
    stories.filter(story =>
      savedStoryIds.includes(Number(story.id))
    );

  if (!saved.length) {

    container.innerHTML = `
      <div class="empty">
        <p>Your library is empty.</p>
        <p>Tap ♡ on a story to save it here.</p>
      </div>
    `;

  } else {

    container.innerHTML =
      saved.map(story => `

        <div class="library-story">

          <div>

            <h3>
              ${escapeHtml(story.title)}
            </h3>

            <small>
              ${escapeHtml(
                story.category || "Story"
              )}
            </small>

          </div>

          <button
            class="library-open"
            onclick="openStory(${Number(story.id)}); closeModal('libraryModal');"
          >
            Read
          </button>

        </div>

      `).join("");

  }

  document
    .getElementById("libraryModal")
    .classList.remove("hidden");

}


/* =========================
   SEARCH
========================= */

function handleSearch(event) {

  const query =
    event.target.value.trim().toLowerCase();

  const resultsSection =
    document.getElementById("searchResultsSection");

  if (!query) {

    resultsSection.classList.add("hidden");

    return;

  }

  const results =
    stories.filter(story => {

      return (

        String(story.title || "")
          .toLowerCase()
          .includes(query)

        ||

        String(story.category || "")
          .toLowerCase()
          .includes(query)

        ||

        String(story.description || "")
          .toLowerCase()
          .includes(query)

      );

    });

  resultsSection.classList.remove("hidden");

  document
    .getElementById("searchResultText")
    .textContent =
    results.length +
    " story" +
    (results.length === 1 ? "" : "ies") +
    " found.";

  document
    .getElementById("searchResults")
    .innerHTML =
    results.length
      ? results.map(storyCard).join("")
      : `<div class="empty">No stories found.</div>`;

}


function filterGenre(genre) {

  const matching =
    stories.filter(story =>
      normalizeCategory(story.category) ===
      normalizeCategory(genre)
    );

  const section =
    document.getElementById("searchResultsSection");

  section.classList.remove("hidden");

  document
    .getElementById("searchResultText")
    .textContent =
    matching.length +
    " " +
    genre +
    " stor" +
    (matching.length === 1 ? "y" : "ies");

  document
    .getElementById("searchResults")
    .innerHTML =
    matching.length
      ? matching.map(storyCard).join("")
      : `<div class="empty">No ${escapeHtml(genre)} stories yet.</div>`;

  section.scrollIntoView({
    behavior: "smooth"
  });

}


/* =========================
   HELPERS
========================= */

function normalizeCategory(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}


function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function closeModal(id) {

  document
    .getElementById(id)
    .classList.add("hidden");

}
