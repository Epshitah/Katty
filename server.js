const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new Database("epshitah.db");

// Create tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT,
    description TEXT,
    content TEXT,
    price REAL DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    story_id INTEGER,
    status TEXT DEFAULT 'paid',
    provider TEXT DEFAULT 'demo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "epshitah-stories-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Serve CSS, JavaScript and other files from the root
app.use(express.static(__dirname));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// -------------------------
// REGISTER
// -------------------------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(cleanEmail);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
      `)
      .run(name.trim(), cleanEmail, hashedPassword);

    req.session.userId = result.lastInsertRowid;

    res.json({
      success: true,
      message: "Account created successfully."
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while creating your account."
    });
  }
});

// -------------------------
// LOGIN
// -------------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password."
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password."
      });
    }

    req.session.userId = user.id;

    res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while logging in."
    });
  }
});

// -------------------------
// CURRENT USER
// -------------------------
app.get("/api/me", (req, res) => {
  if (!req.session.userId) {
    return res.json({
      loggedIn: false
    });
  }

  const user = db
    .prepare(`
      SELECT id, name, email
      FROM users
      WHERE id = ?
    `)
    .get(req.session.userId);

  if (!user) {
    return res.json({
      loggedIn: false
    });
  }

  res.json({
    loggedIn: true,
    user: user
  });
});

// -------------------------
// LOGOUT
// -------------------------
app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Could not log out."
      });
    }

    res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// -------------------------
// GET ALL STORIES
// -------------------------
app.get("/api/stories", (req, res) => {
  try {
    const stories = db
      .prepare(`
        SELECT id, title, genre, description, price, created_at
        FROM stories
        ORDER BY id DESC
      `)
      .all();

    res.json(stories);

  } catch (error) {
    console.error("STORIES ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not load stories."
    });
  }
});

// -------------------------
// GET ONE STORY
// -------------------------
app.get("/api/stories/:id", (req, res) => {
  try {
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found."
      });
    }

    res.json(story);

  } catch (error) {
    console.error("STORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not load the story."
    });
  }
});

// -------------------------
// ADD STORY
// -------------------------
app.post("/api/stories", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  try {
    const {
      title,
      genre,
      description,
      content,
      price
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and story content are required."
      });
    }

    const storyPrice =
      price !== undefined && price !== ""
        ? Number(price)
        : 30;

    const result = db
      .prepare(`
        INSERT INTO stories
        (title, genre, description, content, price)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        title.trim(),
        genre || "",
        description || "",
        content,
        storyPrice
      );

    res.json({
      success: true,
      message: "Story saved successfully.",
      storyId: result.lastInsertRowid
    });

  } catch (error) {
    console.error("ADD STORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not save the story."
    });
  }
});

// -------------------------
// DELETE STORY
// -------------------------
app.delete("/api/stories/:id", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  try {
    db.prepare("DELETE FROM stories WHERE id = ?")
      .run(req.params.id);

    res.json({
      success: true,
      message: "Story deleted successfully."
    });

  } catch (error) {
    console.error("DELETE STORY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete the story."
    });
  }
});

// -------------------------
// DEMO PURCHASE
// -------------------------
app.post("/api/purchase", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  try {
    const { storyId } = req.body;

    const story = db
      .prepare("SELECT id FROM stories WHERE id = ?")
      .get(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found."
      });
    }

    db.prepare(`
      INSERT INTO purchases
      (user_id, story_id, status, provider)
      VALUES (?, ?, 'paid', 'demo')
    `).run(
      req.session.userId,
      storyId
    );

    res.json({
      success: true,
      message: "Purchase successful."
    });

  } catch (error) {
    console.error("PURCHASE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not complete purchase."
    });
  }
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
  console.log(
    `Epshitah Stories running on port ${PORT}`
  );
});
