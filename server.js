const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Important for Render HTTPS/proxy
app.set("trust proxy", 1);

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "ralejoemolebatsi189@gmail.com";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const users = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);


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


// =========================
// READER ACCOUNTS
// =========================

app.get("/api/me", (req, res) => {

  if (!req.session.userEmail) {
    return res.json({
      loggedIn: false
    });
  }

  const user =
    users.get(req.session.userEmail);

  if (!user) {
    return res.json({
      loggedIn: false
    });
  }

  res.json({
    loggedIn: true,

    user: {
      name: user.name,
      email: user.email
    }
  });

});


app.post("/api/signup", (req, res) => {

  const name =
    String(req.body.name || "").trim();

  const email =
    cleanEmail(req.body.email);

  const password =
    String(req.body.password || "");


  if (!name || !email || !password) {

    return res.status(400).json({
      message: "Please fill in all fields."
    });

  }


  if (password.length < 6) {

    return res.status(400).json({
      message:
        "Password must be at least 6 characters."
    });

  }


  if (users.has(email)) {

    return res.status(400).json({
      message:
        "An account with this email already exists."
    });

  }


  const user = {
    name: name,
    email: email,
    password: hashPassword(password)
  };


  users.set(email, user);

  req.session.userEmail = email;


  res.json({
    message:
      "Account created successfully!",

    user: {
      name: user.name,
      email: user.email
    }
  });

});


app.post("/api/login", (req, res) => {

  const email =
    cleanEmail(req.body.email);

  const password =
    String(req.body.password || "");

  const user =
    users.get(email);


  if (!user) {

    return res.status(401).json({
      message:
        "Email or password is incorrect."
    });

  }


  if (
    user.password !==
    hashPassword(password)
  ) {

    return res.status(401).json({
      message:
        "Email or password is incorrect."
    });

  }


  req.session.userEmail = email;


  res.json({
    message:
      "Logged in successfully!",

    user: {
      name: user.name,
      email: user.email
    }
  });

});


app.post("/api/logout", (req, res) => {

  req.session.destroy(() => {

    res.clearCookie("connect.sid");

    res.json({
      message:
        "Logged out successfully."
    });

  });

});


// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin/login", (req, res) => {

  const email =
    cleanEmail(req.body.email);

  const password =
    String(req.body.password || "");


  if (!ADMIN_PASSWORD) {

    return res.status(500).json({
      message:
        "Admin password has not been configured on the server."
    });

  }


  if (
    email !== cleanEmail(ADMIN_EMAIL) ||
    password !== ADMIN_PASSWORD
  ) {

    return res.status(401).json({
      message:
        "Admin email or password is incorrect."
    });

  }


  req.session.isAdmin = true;

  req.session.adminEmail =
    ADMIN_EMAIL;


  req.session.save((error) => {

    if (error) {

      console.error(
        "Admin session error:",
        error
      );

      return res.status(500).json({
        message:
          "Login worked, but the admin session could not be saved."
      });

    }


    res.json({
      message:
        "Admin login successful."
    });

  });

});


// =========================
// CHECK ADMIN
// =========================

app.get("/api/admin/me", (req, res) => {

  if (!req.session.isAdmin) {

    return res.json({
      loggedIn: false
    });

  }


  res.json({
    loggedIn: true,
    email: req.session.adminEmail
  });

});


// =========================
// ADMIN LOGOUT
// =========================

app.post("/api/admin/logout", (req, res) => {

  req.session.destroy(() => {

    res.clearCookie("connect.sid");

    res.json({
      message:
        "Admin logged out."
    });

  });

});


// =========================
// ADMIN PAGE
// =========================

app.get("/admin", (req, res) => {

  if (!req.session.isAdmin) {

    return res.status(401).send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0">

<title>Epshitah Stories Admin</title>

<style>

body {
  margin: 0;
  padding: 30px 15px;
  font-family: Arial, sans-serif;
  background: #fff8fb;
}

.box {
  max-width: 450px;
  margin: 40px auto;
  background: white;
  padding: 25px;
  border-radius: 18px;
  box-shadow: 0 5px 20px #0002;
}

h1,
h2 {
  color: #7b174d;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
}

button {
  width: 100%;
  padding: 13px;
  margin-top: 10px;
  border: 0;
  border-radius: 10px;
  background: #8d1f59;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.message {
  margin: 12px 0;
  font-weight: bold;
}

a {
  display: block;
  margin-top: 15px;
  text-align: center;
  color: #7b174d;
}

</style>

</head>


<body>

<div class="box">

<h1>
Epshitah Stories
</h1>

<h2>
Admin Login
</h2>

<input
id="email"
type="email"
placeholder="Admin email">

<input
id="password"
type="password"
placeholder="Admin password">

<div
id="message"
class="message">
</div>

<button onclick="login()">
Log In
</button>

<a href="/">
← Back to Epshitah Stories
</a>

</div>


<script>

async function login() {

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const message =
    document.getElementById("message");


  message.textContent =
    "Logging in...";


  try {

    const response =
      await fetch(
        "/api/admin/login",
        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );


    const data =
      await response.json();


    message.textContent =
      data.message;


    if (response.ok) {

      setTimeout(
        function() {

          window.location.href =
            "/admin";

        },
        500
      );

    }

  } catch (error) {

    message.textContent =
      "Something went wrong. Please try again.";

  }

}

</script>

</body>

</html>

`);

  }


  res.sendFile(
    path.join(
      __dirname,
      "private",
      "admin.html"
    )
  );

});


// Protect private folder
app.use((req, res, next) => {

  if (
    req.path.startsWith("/private/")
  ) {

    return res
      .status(404)
      .send("Not found");

  }

  next();

});


// Public website
app.use(
  express.static(".")
);


// Start server
app.listen(PORT, () => {

  console.log(
    `Epshitah Stories running on port ${PORT}`
  );

});
