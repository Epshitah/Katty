const express = require("express");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary user storage for testing
const users = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Login sessions
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "epshitah-test-secret-change-later",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// Simple password hashing for this test version
function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

function cleanEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// Check current logged-in user
app.get("/api/me", (req, res) => {
  if (!req.session.userEmail) {
    return res.json({ loggedIn: false });
  }

  const user = users.get(req.session.userEmail);

  if (!user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// SIGN UP
app.post("/api/signup", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Please fill in all fields."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters."
    });
  }

  if (users.has(email)) {
    return res.status(400).json({
      message: "An account with this email already exists."
    });
  }

  const user = {
    name,
    email,
    password: hashPassword(password)
  };

  users.set(email, user);

  req.session.userEmail = email;

  res.json({
    message: "Account created successfully!",
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// LOG IN
app.post("/api/login", (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  const user = users.get(email);

  if (!user) {
    return res.status(401).json({
      message: "Email or password is incorrect."
    });
  }

  if (user.password !== hashPassword(password)) {
    return res.status(401).json({
      message: "Email or password is incorrect."
    });
  }

  req.session.userEmail = email;

  res.json({
    message: "Logged in successfully!",
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// LOG OUT
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");

    res.json({
      message: "Logged out successfully."
    });
  });
});

// Serve the website
app.use(express.static("."));

app.listen(PORT, () => {
  console.log(`Epshitah Stories running on port ${PORT}`);
});
