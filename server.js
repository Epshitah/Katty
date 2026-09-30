const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "ralejoemolebatsi189@gmail.com"
).trim().toLowerCase();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

if (!process.env.ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD is missing.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "change-this-session-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);


/* =========================================================
   DATABASE
========================================================= */

async function initDb() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT DEFAULT 'Other',
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      cover TEXT DEFAULT '',
      published INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT NOT NULL,
      thumbnail TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);


  /*
    Make sure the ADMIN account exists.

    The password comes from Render's ADMIN_PASSWORD
    environment variable.
  */

  const hash = bcrypt.hashSync(
    process.env.ADMIN_PASSWORD,
    10
  );

  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email)=LOWER($1)",
    [ADMIN_EMAIL]
  );

  if (existing.rows.length) {

    await pool.query(
      `
      UPDATE users
      SET password=$1
      WHERE id=$2
      `,
      [
        hash,
        existing.rows[0].id
      ]
    );

  } else {

    await pool.query(
      `
      INSERT INTO users(name,email,password)
      VALUES($1,$2,$3)
      `,
      [
        "Epshitah Admin",
        ADMIN_EMAIL,
        hash
      ]
    );

  }

}


/* =========================================================
   USER HELPERS
========================================================= */

async function currentUser(req) {

  if (!req.session.userId) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT id,name,email
    FROM users
    WHERE id=$1
    `,
    [
      req.session.userId
    ]
  );

  return result.rows[0] || null;
}


/* =========================================================
   ADMIN HELPERS
========================================================= */

async function currentAdmin(req) {

  if (!req.session.adminUserId) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT id,name,email
    FROM users
    WHERE id=$1
    `,
    [
      req.session.adminUserId
    ]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  if (
    user.email.toLowerCase() !==
    ADMIN_EMAIL
  ) {
    return null;
  }

  return user;
}


async function requireAdmin(req, res, next) {

  try {

    const admin = await currentAdmin(req);

    if (!admin) {

      return res.status(401).json({
        error: "Admin login required."
      });

    }

    req.currentAdmin = admin;

    next();

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error."
    });

  }

}


/* =========================================================
   PAGES
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});


app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});


app.get("/admin.html", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});


app.use(express.static(__dirname));


/* =========================================================
   READER REGISTRATION
========================================================= */

app.post("/api/register", async (req, res) => {

  try {

    const name =
      String(req.body.name || "").trim();

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");


    if (
      !name ||
      !email ||
      password.length < 6
    ) {

      return res.status(400).json({
        error:
          "Enter your name, email and a password of at least 6 characters."
      });

    }


    /*
      Prevent readers from registering
      with the Admin email.
    */

    if (email === ADMIN_EMAIL) {

      return res.status(400).json({
        error:
          "This email belongs to the Admin account. Please use Admin Login."
      });

    }


    const hash =
      bcrypt.hashSync(password, 10);


    const result = await pool.query(
      `
      INSERT INTO users(name,email,password)
      VALUES($1,$2,$3)
      RETURNING id,name,email
      `,
      [
        name,
        email,
        hash
      ]
    );


    const user = result.rows[0];

    req.session.userId = user.id;

    res.json({

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        isAdmin: false

      }

    });


  } catch (error) {

    if (error.code === "23505") {

      return res.status(400).json({
        error:
          "That email is already registered."
      });

    }

    console.error(error);

    res.status(500).json({
      error:
        "Could not create account."
    });

  }

});


/* =========================================================
   READER LOGIN
========================================================= */

app.post("/api/login", async (req, res) => {

  try {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");


    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email)=LOWER($1)
      `,
      [
        email
      ]
    );


    const user = result.rows[0];


    if (
      !user ||
      !bcrypt.compareSync(
        password,
        user.password
      )
    ) {

      return res.status(401).json({
        error:
          "Incorrect email or password."
      });

    }


    /*
      Reader login only creates a reader session.
      It does NOT create an admin session.
    */

    req.session.userId = user.id;


    res.json({

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        isAdmin:
          user.email.toLowerCase() ===
          ADMIN_EMAIL

      }

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Login failed."
    });

  }

});


/* =========================================================
   READER LOGOUT
========================================================= */

app.post("/api/logout", (req, res) => {

  req.session.userId = null;

  res.json({
    ok: true
  });

});


/* =========================================================
   READER CURRENT USER
========================================================= */

app.get("/api/me", async (req, res) => {

  try {

    const user =
      await currentUser(req);


    if (!user) {

      return res.json({
        user: null
      });

    }


    res.json({

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        isAdmin:
          user.email.toLowerCase() ===
          ADMIN_EMAIL

      }

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Server error."
    });

  }

});


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post("/api/admin/login", async (req, res) => {

  try {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");


    /*
      The Admin login accepts ONLY
      the configured ADMIN_EMAIL.
    */

    if (email !== ADMIN_EMAIL) {

      return res.status(401).json({
        error:
          "This is not the Admin account."
      });

    }


    /*
      Verify against the Render
      ADMIN_PASSWORD.
    */

    if (
      password !==
      process.env.ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        error:
          "Incorrect Admin password."
      });

    }


    /*
      Find the Admin account in PostgreSQL.
    */

    const result = await pool.query(
      `
      SELECT id,name,email
      FROM users
      WHERE LOWER(email)=LOWER($1)
      `,
      [
        ADMIN_EMAIL
      ]
    );


    const admin = result.rows[0];


    if (!admin) {

      return res.status(500).json({
        error:
          "Admin account was not created."
      });

    }


    /*
      IMPORTANT:
      This is a separate Admin session.
    */

    req.session.adminUserId =
      admin.id;


    /*
      Clear reader session so the two
      areas remain completely separate.
    */

    req.session.userId = null;


    res.json({

      ok: true,

      admin: {

        id: admin.id,

        name: admin.name,

        email: admin.email

      }

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Admin login failed."
    });

  }

});


/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post("/api/admin/logout", (req, res) => {

  req.session.adminUserId = null;

  res.json({
    ok: true
  });

});


/* =========================================================
   ADMIN CURRENT SESSION
========================================================= */

app.get("/api/admin/me", async (req, res) => {

  try {

    const admin =
      await currentAdmin(req);


    if (!admin) {

      return res.json({
        admin: null
      });

    }


    res.json({

      admin: {

        id: admin.id,

        name: admin.name,

        email: admin.email

      }

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Server error."
    });

  }

});


/* =========================================================
   PUBLIC STORIES
========================================================= */

app.get("/api/stories", async (req, res) => {

  try {

    const q =
      String(req.query.q || "").trim();

    const genre =
      String(req.query.genre || "").trim();


    let sql = `
      SELECT
        id,
        title,
        genre,
        description,
        cover,
        published,
        created_at,
        updated_at
      FROM stories
      WHERE published=1
    `;

    const args = [];


    if (q) {

      args.push(`%${q}%`);

      sql += `
        AND (
          title ILIKE $${args.length}
          OR description ILIKE $${args.length}
          OR genre ILIKE $${args.length}
        )
      `;

    }


    if (
      genre &&
      genre !== "All"
    ) {

      args.push(genre);

      sql += `
        AND genre=$${args.length}
      `;

    }


    sql += `
      ORDER BY updated_at DESC,id DESC
    `;


    const result =
      await pool.query(
        sql,
        args
      );


    res.json({
      stories: result.rows
    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Could not load stories."
    });

  }

});


/* =========================================================
   PUBLIC SINGLE STORY
========================================================= */

app.get("/api/stories/:id", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT *
        FROM stories
        WHERE id=$1
        AND published=1
        `,
        [
          req.params.id
        ]
      );


    if (!result.rows.length) {

      return res.status(404).json({
        error:
          "Story not found."
      });

    }


    res.json({
      story: result.rows[0]
    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Could not load story."
    });

  }

});


/* =========================================================
   ADMIN STORIES
========================================================= */

app.get(
  "/api/admin/stories",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT *
          FROM stories
          ORDER BY updated_at DESC,id DESC
          `
        );


      res.json({
        stories: result.rows
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not load stories."
      });

    }

  }
);


/* =========================================================
   CREATE STORY
========================================================= */

app.post(
  "/api/admin/stories",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        title,
        genre = "Other",
        description = "",
        content,
        cover = "",
        published = false
      } = req.body;


      if (
        !title ||
        !content
      ) {

        return res.status(400).json({
          error:
            "Title and story content are required."
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO stories
          (
            title,
            genre,
            description,
            content,
            cover,
            published,
            updated_at
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            CURRENT_TIMESTAMP
          )
          RETURNING *
          `,
          [
            String(title).trim(),
            String(genre).trim(),
            String(description),
            String(content),
            String(cover),
            published ? 1 : 0
          ]
        );


      res.json({
        story: result.rows[0]
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not save story."
      });

    }

  }
);


/* =========================================================
   UPDATE STORY
========================================================= */

app.put(
  "/api/admin/stories/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        title,
        genre = "Other",
        description = "",
        content,
        cover = "",
        published = false
      } = req.body;


      if (
        !title ||
        !content
      ) {

        return res.status(400).json({
          error:
            "Title and story content are required."
        });

      }


      const result =
        await pool.query(
          `
          UPDATE stories
          SET
            title=$1,
            genre=$2,
            description=$3,
            content=$4,
            cover=$5,
            published=$6,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=$7
          RETURNING *
          `,
          [
            String(title).trim(),
            String(genre).trim(),
            String(description),
            String(content),
            String(cover),
            published ? 1 : 0,
            req.params.id
          ]
        );


      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "Story not found."
        });

      }


      res.json({
        story: result.rows[0]
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not update story."
      });

    }

  }
);


/* =========================================================
   DELETE STORY
========================================================= */

app.delete(
  "/api/admin/stories/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          DELETE FROM stories
          WHERE id=$1
          RETURNING id
          `,
          [
            req.params.id
          ]
        );


      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "Story not found."
        });

      }


      res.json({
        ok: true
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not delete story."
      });

    }

  }
);


/* =========================================================
   PUBLISH / UNPUBLISH
========================================================= */

app.patch(
  "/api/admin/stories/:id/publish",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT published
          FROM stories
          WHERE id=$1
          `,
          [
            req.params.id
          ]
        );


      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "Story not found."
        });

      }


      const published =
        result.rows[0].published
          ? 0
          : 1;


      await pool.query(
        `
        UPDATE stories
        SET
          published=$1,
          updated_at=CURRENT_TIMESTAMP
        WHERE id=$2
        `,
        [
          published,
          req.params.id
        ]
      );


      res.json({
        published: !!published
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not change publication status."
      });

    }

  }
);


/* =========================================================
   VIDEOS
========================================================= */

app.get("/api/videos", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT *
        FROM videos
        ORDER BY created_at DESC,id DESC
        `
      );


    res.json({
      videos: result.rows
    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Could not load videos."
    });

  }

});


app.get(
  "/api/admin/videos",
  requireAdmin,
  async (req, res) => {

    const result =
      await pool.query(
        `
        SELECT *
        FROM videos
        ORDER BY created_at DESC,id DESC
        `
      );


    res.json({
      videos: result.rows
    });

  }
);


app.post(
  "/api/admin/videos",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        title,
        description = "",
        url,
        thumbnail = ""
      } = req.body;


      if (!title || !url) {

        return res.status(400).json({
          error:
            "Video title and URL are required."
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO videos
          (
            title,
            description,
            url,
            thumbnail
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4
          )
          RETURNING *
          `,
          [
            String(title).trim(),
            String(description),
            String(url).trim(),
            String(thumbnail)
          ]
        );


      res.json({
        video: result.rows[0]
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not save video."
      });

    }

  }
);


/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  requireAdmin,
  async (req, res) => {

    try {

      const total =
        Number(
          (
            await pool.query(
              "SELECT COUNT(*) n FROM stories"
            )
          ).rows[0].n
        );


      const published =
        Number(
          (
            await pool.query(
              "SELECT COUNT(*) n FROM stories WHERE published=1"
            )
          ).rows[0].n
        );


      const videos =
        Number(
          (
            await pool.query(
              "SELECT COUNT(*) n FROM videos"
            )
          ).rows[0].n
        );


      const users =
        Number(
          (
            await pool.query(
              "SELECT COUNT(*) n FROM users"
            )
          ).rows[0].n
        );


      res.json({

        total,

        published,

        drafts:
          total - published,

        videos,

        users

      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Could not load statistics."
      });

    }

  }
);


/* =========================================================
   START SERVER
========================================================= */

initDb()

  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log(
          `Epshitah Stories running on ${PORT}`
        );

      }
    );

  })

  .catch(error => {

    console.error(
      "Database initialization failed:",
      error
    );

    process.exit(1);

  });
