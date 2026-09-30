let currentUser = null;
let currentStoryId = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  checkUser();
  loadStories();
});

/* =========================
   EVENTS
========================= */

function setupEvents() {
  $("loginBtn").addEventListener("click", openLogin);
  $("logoutBtn").addEventListener("click", logout);

  $("closeModal").addEventListener(
    "click",
    closeAuth
  );

  $("closeStory").addEventListener(
    "click",
    closeStory
  );

  $("showRegister").addEventListener(
    "click",
    showRegister
  );

  $("showLogin").addEventListener(
    "click",
    showLogin
  );

  $("loginForm").addEventListener(
    "submit",
    login
  );

  $("registerForm").addEventListener(
    "submit",
    register
  );

  $("purchaseBtn").addEventListener(
    "click",
    purchaseStory
  );

  $("authModal").addEventListener(
    "click",
    (event) => {
      if (event.target === $("authModal")) {
        closeAuth();
      }
    }
  );

  $("storyModal").addEventListener(
    "click",
    (event) => {
      if (event.target === $("storyModal")) {
        closeStory();
      }
    }
  );
}

/* =========================
   USER
========================= */

async function checkUser() {
  try {
    const response = await fetch("/api/me");
    const data = await response.json();

    currentUser = data.user || null;

    updateHeader();
  } catch (error) {
    console.error(
      "Could not check user:",
      error
    );
  }
}

function updateHeader() {
  const loginBtn = $("loginBtn");
  const logoutBtn = $("logoutBtn");
  const adminLink = $("adminLink");

  if (currentUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    if (currentUser.role === "admin") {
      adminLink.classList.remove("hidden");
    } else {
      adminLink.classList.add("hidden");
    }
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    adminLink.classList.add("hidden");
  }
}

/* =========================
   AUTH MODAL
========================= */

function openLogin() {
  $("authModal").classList.remove("hidden");
  showLogin();
}

function closeAuth() {
  $("authModal").classList.add("hidden");

  $("loginMessage").textContent = "";
  $("registerMessage").textContent = "";
}

function showLogin() {
  $("loginPanel").classList.remove("hidden");
  $("registerPanel").classList.add("hidden");
}

function showRegister() {
  $("loginPanel").classList.add("hidden");
  $("registerPanel").classList.remove("hidden");
}

/* =========================
   LOGIN
========================= */

async function login(event) {
  event.preventDefault();

  const email =
    $("loginEmail").value.trim();

  const password =
    $("loginPassword").value;

  $("loginMessage").textContent =
    "Logging in...";

  try {
    const response = await fetch(
      "/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      $("loginMessage").textContent =
        data.message ||
        "Login failed.";

      return;
    }

    currentUser = data.user;

    updateHeader();
    closeAuth();

    $("loginForm").reset();

    if (currentStoryId) {
      openStory(currentStoryId);
    }
  } catch (error) {
    console.error(error);

    $("loginMessage").textContent =
      "Something went wrong. Please try again.";
  }
}

/* =========================
   REGISTER
========================= */

async function register(event) {
  event.preventDefault();

  const name =
    $("registerName").value.trim();

  const email =
    $("registerEmail").value.trim();

  const password =
    $("registerPassword").value;

  $("registerMessage").textContent =
    "Creating your account...";

  try {
    const response = await fetch(
      "/api/register",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      $("registerMessage").textContent =
        data.message ||
        "Could not create account.";

      return;
    }

    currentUser = data.user;

    updateHeader();
    closeAuth();

    $("registerForm").reset();

    alert(
      "Welcome to Epshitah Stories, " +
        currentUser.name +
        "!"
    );
  } catch (error) {
    console.error(error);

    $("registerMessage").textContent =
      "Something went wrong. Please try again.";
  }
}

/* =========================
   LOGOUT
========================= */

async function logout() {
  try {
    await fetch(
      "/api/logout",
      {
        method: "POST"
      }
    );
  } catch (error) {
    console.error(error);
  }

  currentUser = null;

  updateHeader();

  closeStory();

  alert("You have been logged out.");
}

/* =========================
   STORIES
========================= */

async function loadStories() {
  const grid =
    $("storiesGrid");

  try {
    const response =
      await fetch("/api/stories");

    if (!response.ok) {
      throw new Error(
        "Failed to load stories."
      );
    }

    const stories =
      await response.json();

    $("storyCount").textContent =
      `${stories.length} ${
        stories.length === 1
          ? "story"
          : "stories"
      }`;

    if (!stories.length) {
      grid.innerHTML = `
        <div class="empty">
          <h3>No stories yet</h3>
          <p>
            New stories will appear here soon.
          </p>
        </div>
      `;

      return;
    }

    grid.innerHTML =
      stories.map(
        story => storyCard(story)
      ).join("");

    document
      .querySelectorAll(".read-btn")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            openStory(
              button.dataset.id
            );
          }
        );
      });
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="empty">
        <h3>Stories could not be loaded</h3>
        <p>
          Please refresh the page and try again.
        </p>
      </div>
    `;
  }
}

function storyCard(story) {
  const price =
    Number(story.price);

  const priceText =
    price > 0
      ? `M ${price.toFixed(2)}`
      : "Free";

  const cover =
    story.cover_url
      ? `
        <img
          src="${escapeHtml(
            story.cover_url
          )}"
          alt="${escapeHtml(
            story.title
          )}"
        >
      `
      : `
        <div class="story-cover-placeholder">
          ✦
        </div>
      `;

  return `
    <article class="story-card">

      <div class="story-cover">
        ${cover}
      </div>

      <div class="story-info">

        <div class="story-genre">
          ${escapeHtml(
            story.genre
          )}
        </div>

        <h3>
          ${escapeHtml(
            story.title
          )}
        </h3>

        <p>
          ${escapeHtml(
            story.description
          )}
        </p>

        <div class="story-bottom">

          <span class="story-price">
            ${priceText}
          </span>

          <button
            class="read-btn"
            data-id="${story.id}"
          >
            Read Story
          </button>

        </div>

      </div>

    </article>
  `;
}

/* =========================
   OPEN STORY
========================= */

async function openStory(id) {
  currentStoryId = id;

  $("storyModal")
    .classList.remove("hidden");

  $("readerTitle").textContent =
    "Loading...";

  $("readerGenre").textContent = "";

  $("readerDescription")
    .textContent = "";

  $("readerContent")
    .innerHTML = "";

  $("lockedBox")
    .classList.add("hidden");

  try {
    const response =
      await fetch(
        `/api/stories/${id}`
      );

    const story =
      await response.json();

    if (!response.ok) {
      throw new Error(
        story.message ||
        "Story not found."
      );
    }

    $("readerGenre").textContent =
      story.genre;

    $("readerTitle").textContent =
      story.title;

    $("readerDescription")
      .textContent =
      story.description;

    if (story.unlocked) {
      $("lockedBox")
        .classList.add("hidden");

      $("readerContent")
        .innerHTML =
        formatStory(
          story.content
        );
    } else {
      $("readerContent")
        .innerHTML = "";

      $("lockedBox")
        .classList.remove("hidden");

      $("readerPrice").textContent =
        `Unlock this story for M ${Number(
          story.price
        ).toFixed(2)}.`;

      $("purchaseMessage")
        .textContent = "";
    }
  } catch (error) {
    console.error(error);

    $("readerTitle").textContent =
      "Could not open story";

    $("readerContent").textContent =
      error.message;
  }
}

/* =========================
   CLOSE STORY
========================= */

function closeStory() {
  $("storyModal")
    .classList.add("hidden");

  currentStoryId = null;
}

/* =========================
   PURCHASE
========================= */

async function purchaseStory() {
  if (!currentStoryId) {
    return;
  }

  if (!currentUser) {
    closeStory();
    openLogin();

    $("loginMessage").textContent =
      "Please log in to unlock this story.";

    return;
  }

  const button =
    $("purchaseBtn");

  button.disabled = true;
  button.textContent =
    "Processing...";

  $("purchaseMessage")
    .textContent =
    "Demo payment is being processed...";

  try {
    const response =
      await fetch(
        `/api/stories/${currentStoryId}/purchase-demo`,
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Purchase failed."
      );
    }

    $("purchaseMessage")
      .textContent =
      "Story unlocked!";

    await openStory(
      currentStoryId
    );
  } catch (error) {
    console.error(error);

    $("purchaseMessage")
      .textContent =
      error.message;
  } finally {
    button.disabled = false;
    button.textContent =
      "Unlock Story";
  }
}

/* =========================
   STORY FORMAT
========================= */

function formatStory(content) {
  if (!content) {
    return "";
  }

  return escapeHtml(content)
    .split(/\n\s*\n/)
    .map(
      paragraph =>
        `<p>${paragraph.replace(
          /\n/g,
          "<br>"
        )}</p>`
    )
    .join("");
}

/* =========================
   SECURITY
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
