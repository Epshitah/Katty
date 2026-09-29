let allStories = [];

const genres = [
  "Romance",
  "Drama",
  "Heartbreak",
  "Thriller",
  "Mystery",
  "Life Stories"
];


// ===============================
// LOAD STORIES
// ===============================

async function loadStories() {

  const featured = document.getElementById("featuredStories");

  try {

    const response = await fetch("/api/stories");

    if (!response.ok) {
      throw new Error("Could not load stories");
    }

    const stories = await response.json();

    /*
      Remove Epshitah 2026 from the homepage.
      It is not treated as a featured homepage story.
    */

    allStories = stories.filter(story =>
      String(story.title || "").trim().toLowerCase() !== "epshitah 2026"
    );

    renderFeatured();
    renderGenreSections();

  } catch (error) {

    console.error(error);

    featured.innerHTML = `
      <div class="empty">
        Stories could not be loaded right now.
      </div>
    `;
  }
}


// ===============================
// FEATURED STORIES
// ===============================

function renderFeatured() {

  const container =
    document.getElementById("featuredStories");

  if (!allStories.length) {

    container.innerHTML = `
      <div class="empty">
        New stories are coming soon ❤️
      </div>
    `;

    return;
  }

  const stories = allStories.slice(0, 4);

  container.innerHTML =
    stories.map(createStoryCard).join("");
}


// ===============================
// GENRE SECTIONS
// ===============================

function renderGenreSections() {

  const container =
    document.getElementById("genreSections");

  container.innerHTML = "";

  genres.forEach(genre => {

    const stories = allStories.filter(story =>
      normalizeCategory(story.category) === normalizeCategory(genre)
    );

    if (!stories.length) {
      return;
    }

    const section = document.createElement("section");

    section.className = "genre-section";

    section.innerHTML = `

      <div class="section-heading">

        <div>
          <p class="section-small">EXPLORE</p>
          <h2>${escapeHTML(genre)} Stories</h2>
        </div>

        <button
          class="see-all"
          onclick="showGenre('${escapeHTML(genre)}')">
          See All →
        </button>

      </div>

      <div class="story-grid">

        ${stories.slice(0, 4)
          .map(createStoryCard)
          .join("")}

      </div>
    `;

    container.appendChild(section);
  });
}


// ===============================
// STORY CARD
// ===============================

function createStoryCard(story) {

  const title =
    escapeHTML(story.title || "Untitled Story");

  const category =
    escapeHTML(story.category || "Life Stories");

  const description =
    escapeHTML(
      story.description ||
      "A story waiting to be discovered."
    );

  return `

    <article class="story-card">

      <div class="story-cover">
        <span>📖</span>
      </div>

      <div class="story-info">

        <span class="story-category">
          ${category}
        </span>

        <h3>${title}</h3>

        <p>${description}</p>

        <button
          class="read-button"
          onclick="openStory(${story.id})">
          Read Story
        </button>

      </div>

    </article>

  `;
}


// ===============================
// SHOW ONE GENRE
// ===============================

function showGenre(genre) {

  const matchingStories = allStories.filter(story =>
    normalizeCategory(story.category) ===
    normalizeCategory(genre)
  );

  const container =
    document.getElementById("featuredStories");

  document.getElementById("stories")
    .scrollIntoView({
      behavior: "smooth"
    });

  if (!matchingStories.length) {

    container.innerHTML = `
      <div class="empty">
        There are no ${escapeHTML(genre)}
        stories yet.
      </div>
    `;

    return;
  }

  container.innerHTML =
    matchingStories
      .map(createStoryCard)
      .join("");

  const heading =
    document.querySelector("#stories h2");

  if (heading) {
    heading.textContent = `${genre} Stories`;
  }
}


// ===============================
// SHOW ALL STORIES
// ===============================

function showAllStories() {

  const container =
    document.getElementById("featuredStories");

  container.innerHTML =
    allStories
      .map(createStoryCard)
      .join("");

  const heading =
    document.querySelector("#stories h2");

  if (heading) {
    heading.textContent = "All Stories";
  }

  document.getElementById("stories")
    .scrollIntoView({
      behavior: "smooth"
    });
}


// ===============================
// OPEN STORY
// ===============================

function openStory(id) {

  const story =
    allStories.find(item =>
      Number(item.id) === Number(id)
    );

  if (!story) {
    return;
  }

  document.getElementById("readerTitle")
    .textContent =
      story.title || "Untitled Story";

  document.getElementById("readerCategory")
    .textContent =
      story.category || "Life Stories";

  document.getElementById("readerDescription")
    .textContent =
      story.description || "";

  document.getElementById("readerContent")
    .textContent =
      story.content || "This story has no content yet.";

  document.getElementById("storyModal")
    .classList.add("show");

  document.body.style.overflow = "hidden";
}


function closeStory() {

  document.getElementById("storyModal")
    .classList.remove("show");

  document.body.style.overflow = "";
}


// ===============================
// AUTH MODAL
// ===============================

function openAuth(type) {

  document.getElementById("authModal")
    .classList.add("show");

  if (type === "signup") {

    document.getElementById("loginForm")
      .style.display = "none";

    document.getElementById("signupForm")
      .style.display = "block";

  } else {

    document.getElementById("loginForm")
      .style.display = "block";

    document.getElementById("signupForm")
      .style.display = "none";
  }

  document.body.style.overflow = "hidden";
}


function closeAuth() {

  document.getElementById("authModal")
    .classList.remove("show");

  document.body.style.overflow = "";
}


// ===============================
// REAL SIGNUP
// ===============================

async function signup(event) {

  event.preventDefault();

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  try {

    const response = await fetch("/api/signup", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        name,
        email,
        password
      })

    });

    const data = await response.json();

    if (!response.ok) {

      alert(data.error || "Could not create account.");

      return;
    }

    alert("Account created successfully! ❤️");

    document.getElementById("signupForm")
      .reset?.();

    openAuth("login");

  } catch (error) {

    console.error(error);

    alert(
      "Something went wrong. Please try again."
    );
  }
}


// ===============================
// REAL LOGIN
// ===============================

async function login(event) {

  event.preventDefault();

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  try {

    const response = await fetch("/api/login", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        password
      })

    });

    const data = await response.json();

    if (!response.ok) {

      alert(data.error || "Login failed.");

      return;
    }

    alert("Welcome back! ❤️");

    closeAuth();

    updateReaderButton(data.user);

  } catch (error) {

    console.error(error);

    alert(
      "Something went wrong. Please try again."
    );
  }
}


// ===============================
// CHECK LOGGED-IN READER
// ===============================

async function checkReader() {

  try {

    const response =
      await fetch("/api/me");

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    if (data.user) {
      updateReaderButton(data.user);
    }

  } catch (error) {

    console.log(
      "No logged-in reader."
    );
  }
}


// ===============================
// UPDATE HEADER
// ===============================

function updateReaderButton(user) {

  const buttons =
    document.querySelector(".header-buttons");

  if (!buttons || !user) {
    return;
  }

  buttons.innerHTML = `

    <span style="
      color:#d8b4fe;
      font-size:13px;
      padding:8px;
    ">
      Hi, ${escapeHTML(user.name)}
    </span>

    <button
      class="signup-btn"
      onclick="logout()">
      Log Out
    </button>

  `;
}


// ===============================
// LOGOUT
// ===============================

async function logout() {

  try {

    await fetch("/api/logout", {
      method: "POST"
    });

    location.reload();

  } catch (error) {

    console.error(error);

    location.reload();
  }
}


// ===============================
// SCROLL
// ===============================

function scrollToStories() {

  document.getElementById("stories")
    .scrollIntoView({
      behavior: "smooth"
    });
}


// ===============================
// CATEGORY NORMALIZATION
// ===============================

function normalizeCategory(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}


// ===============================
// SECURITY
// ===============================

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ===============================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ===============================

window.addEventListener("click", function(event) {

  const auth =
    document.getElementById("authModal");

  const story =
    document.getElementById("storyModal");

  if (event.target === auth) {
    closeAuth();
  }

  if (event.target === story) {
    closeStory();
  }

});


// ===============================
// START
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadStories();

    checkReader();

  }
);
