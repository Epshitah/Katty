const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ||
  "ralejoemolebatsi189@gmail.com";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),

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


// ========================
// DATABASE
// ========================

async function setupDatabase() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'STORY',
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("Database tables are ready.");
}


// ========================
// HELPERS
// ========================

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


// ========================
// READER SIGN UP
// ========================

app.post("/api/signup", async (req, res) => {

  try {

    const name =
      String(req.body.name || "").trim();

    const email =
      cleanEmail(req.body.email);

    const password =
      String(req.body.password || "");


    if (!name || !email || !password) {

      return res.status(400).json({
        message:
          "Please fill in all fields."
      });

    }


    if (password.length < 6) {

      return res.status(400).json({
        message:
          "Password must be at least 6 characters."
      });

    }


    const existing =
      await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );


    if (existing.rows.length > 0) {

      return res.status(400).json({
        message:
          "An account with this email already exists."
      });

    }


    const result =
      await pool.query(
        `
        INSERT INTO users
        (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email
        `,
        [
          name,
          email,
          hashPassword(password)
        ]
      );


    const user =
      result.rows[0];


    req.session.userEmail =
      user.email;


    req.session.save((error) => {

      if (error) {

        console.error(error);

        return res.status(500).json({
          message:
            "Account was created, but the login session could not be saved."
        });

      }


      res.json({

        message:
          "Account created successfully!",

        user: {
          name: user.name,
          email: user.email
        }

      });

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Could not create the account."
    });

  }

});


// ========================
// READER LOGIN
// ========================

app.post("/api/login", async (req, res) => {

  try {

    const email =
      cleanEmail(req.body.email);

    const password =
      String(req.body.password || "");


    const result =
      await pool.query(
        `
        SELECT name, email, password
        FROM users
        WHERE email = $1
        `,
        [email]
      );


    if (result.rows.length === 0) {

      return res.status(401).json({
        message:
          "Email or password is incorrect."
      });

    }


    const user =
      result.rows[0];


    if (
      user.password !==
      hashPassword(password)
    ) {

      return res.status(401).json({
        message:
          "Email or password is incorrect."
      });

    }


    req.session.userEmail =
      user.email;


    req.session.save((error) => {

      if (error) {

        console.error(error);

        return res.status(500).json({
          message:
            "Login worked, but the session could not be saved."
        });

      }


      res.json({

        message:
          "Logged in successfully!",

        user: {
          name: user.name,
          email: user.email
        }

      });

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Could not log in."
    });

  }

});


// ========================
// CURRENT READER
// ========================

app.get("/api/me", async (req, res) => {

  try {

    if (!req.session.userEmail) {

      return res.json({
        loggedIn: false
      });

    }


    const result =
      await pool.query(
        `
        SELECT name, email
        FROM users
        WHERE email = $1
        `,
        [req.session.userEmail]
      );


    if (result.rows.length === 0) {

      return res.json({
        loggedIn: false
      });

    }


    const user =
      result.rows[0];


    res.json({

      loggedIn: true,

      user: {
        name: user.name,
        email: user.email
      }

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      loggedIn: false
    });

  }

});


// ========================
// READER LOGOUT
// ========================

app.post("/api/logout", (req, res) => {

  req.session.destroy(() => {

    res.clearCookie("connect.sid");

    res.json({
      message:
        "Logged out successfully."
    });

  });

});


// ========================
// ADMIN LOGIN
// ========================

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

      console.error(error);

      return res.status(500).json({
        message:
          "Admin login worked, but the session could not be saved."
      });

    }


    res.json({
      message:
        "Admin login successful."
    });

  });

});


// ========================
// CHECK ADMIN
// ========================

app.get("/api/admin/me", (req, res) => {

  if (!req.session.isAdmin) {

    return res.json({
      loggedIn: false
    });

  }


  res.json({

    loggedIn: true,

    email:
      req.session.adminEmail

  });

});


// ========================
// ADMIN LOGOUT
// ========================

app.post("/api/admin/logout", (req, res) => {

  req.session.destroy(() => {

    res.clearCookie("connect.sid");

    res.json({
      message:
        "Admin logged out."
    });

  });

});


// ========================
// ADMIN PAGE
// ========================

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

<h1>Epshitah Stories</h1>

<h2>Admin Login</h2>

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


  const response =
    await fetch("/api/admin/login", {

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

    });


  const data =
    await response.json();


  message.textContent =
    data.message;


  if (response.ok) {

    window.location.href =
      "/admin";

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
      "admin.html"
    )
  );

});


// ========================
// STORIES
// ========================

app.get("/api/stories", async (req, res) => {

  try {

    const result =
      await pool.query(`
        SELECT
          id,
          title,
          category,
          description,
          content,
          created_at AS "createdAt"
        FROM stories
        ORDER BY id DESC
      `);


    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Could not load stories."
    });

  }

});


// ========================
// ADD STORY
// ========================

app.post("/api/admin/stories", async (req, res) => {

  try {

    if (!req.session.isAdmin) {

      return res.status(401).json({
        message:
          "Admin login required."
      });

    }


    const title =
      String(req.body.title || "").trim();

    const category =
      String(req.body.category || "").trim();

    const description =
      String(req.body.description || "").trim();

    const content =
      String(req.body.content || "").trim();


    if (!title || !content) {

      return res.status(400).json({
        message:
          "Story title and story content are required."
      });

    }


    const result =
      await pool.query(
        `
        INSERT INTO stories
        (title, category, description, content)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          title,
          category,
          description,
          content,
          created_at AS "createdAt"
        `,
        [
          title,
          category || "STORY",
          description || "No description added.",
          content
        ]
      );


    res.json({

      message:
        "Story saved successfully!",

      story:
        result.rows[0]

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Could not save the story."
    });

  }

});


// ========================
// DELETE STORY
// ========================

app.delete("/api/admin/stories/:id", async (req, res) => {

  try {

    if (!req.session.isAdmin) {

      return res.status(401).json({
        message:
          "Admin login required."
      });

    }


    const id =
      Number(req.params.id);


    const result =
      await pool.query(
        "DELETE FROM stories WHERE id = $1 RETURNING id",
        [id]
      );


    if (result.rows.length === 0) {

      return res.status(404).json({
        message:
          "Story not found."
      });

    }


    res.json({
      message:
        "Story deleted permanently."
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Could not delete the story."
    });

  }

});


// ========================
// PUBLIC WEBSITE
// ========================

app.use(express.static("."));


// ========================
// START SERVER
// ========================

async function startServer() {

  try {

    await setupDatabase();

    app.listen(PORT, () => {

      console.log(
        `Epshitah Stories running on port ${PORT}`
      );

    });

  } catch (error) {

    console.error(
      "Could not start server:",
      error
    );

    process.exit(1);

  }

}

startServer();
