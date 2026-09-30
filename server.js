const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || ""
)
  .trim()
  .toLowerCase();


/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);


app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),

    secret:
      process.env.SESSION_SECRET ||
      "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      maxAge:
        1000 *
        60 *
        60 *
        24 *
        7
    }
  })
);


app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/* =========================
   DATABASE
========================= */

async function initDatabase() {

  /* =========================
     CREATE NEW TABLES
  ========================= */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'reader',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      genre VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      cover_url TEXT DEFAULT '',
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'demo',
      status VARCHAR(30) NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, story_id)
    );
  `);


  /* =========================
     DATABASE MIGRATION
  ========================= */

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role
    VARCHAR(20)
    NOT NULL
    DEFAULT 'reader'
  `);


  /* =========================
     STORIES MIGRATIONS
  ========================= */

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS genre
    VARCHAR(100)
    NOT NULL
    DEFAULT 'General'
  `);

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS price
    NUMERIC(10,2)
    NOT NULL
    DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS cover_url
    TEXT
    DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS is_published
    BOOLEAN
    NOT NULL
    DEFAULT false
  `);

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS created_at
    TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS updated_at
    TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
  `);


  /* =========================
     ADMIN ACCOUNT
  ========================= */

  if (ADMIN_EMAIL) {

    await pool.query(
      `
      UPDATE users
      SET role = 'admin'
      WHERE LOWER(email) =
            LOWER($1)
      `,
      [ADMIN_EMAIL]
    );

  }

}


/* =========================
   USER HELPER
========================= */

function publicUser(user) {

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

}


/* =========================
   LOGIN PROTECTION
========================= */

function requireLogin(
  req,
  res,
  next
) {

  if (!req.session.user) {

    return res.status(401).json({
      message:
        "Please log in first."
    });

  }

  next();

}


/* =========================
   ADMIN PROTECTION
========================= */

function requireAdmin(
  req,
  res,
  next
) {

  if (
    !req.session.user ||
    req.session.user.role !==
      "admin"
  ) {

    return res.status(403).json({
      message:
        "Admin access required."
    });

  }

  next();

}


/* =========================
   HEALTH
========================= */

app.get(
  "/api/health",
  async (req, res) => {

    try {

      await pool.query(
        "SELECT 1"
      );

      res.json({
        ok: true,
        message:
          "Epshitah Stories server is working."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        ok: false,
        message:
          "Database connection failed."
      });

    }

  }
);


/* =========================
   REGISTER
========================= */

app.post(
  "/api/register",
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );


      if (
        !name ||
        !email ||
        password.length < 6
      ) {

        return res.status(400).json({
          message:
            "Enter your name, a valid email and a password of at least 6 characters."
        });

      }


      const existing =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE LOWER(email) =
                LOWER($1)
          `,
          [email]
        );


      if (existing.rowCount) {

        return res.status(409).json({
          message:
            "An account with that email already exists."
        });

      }


      const role =
        ADMIN_EMAIL &&
        email === ADMIN_EMAIL
          ? "admin"
          : "reader";


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const result =
        await pool.query(
          `
          INSERT INTO users
          (
            name,
            email,
            password_hash,
            role
          )
          VALUES
          ($1, $2, $3, $4)
          RETURNING
            id,
            name,
            email,
            role
          `,
          [
            name,
            email,
            passwordHash,
            role
          ]
        );


      req.session.user =
        publicUser(
          result.rows[0]
        );


      res.status(201).json({
        message:
          "Account created successfully.",
        user:
          req.session.user
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not create account."
      });

    }

  }
);


/* =========================
   LOGIN
========================= */

app.post(
  "/api/login",
  async (req, res) => {

    try {

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );


      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) =
                LOWER($1)
          `,
          [email]
        );


      if (!result.rowCount) {

        return res.status(401).json({
          message:
            "Incorrect email or password."
        });

      }


      const user =
        result.rows[0];


      const validPassword =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (!validPassword) {

        return res.status(401).json({
          message:
            "Incorrect email or password."
        });

      }


      /* Make the configured
         owner account admin */

      if (
        ADMIN_EMAIL &&
        email === ADMIN_EMAIL &&
        user.role !== "admin"
      ) {

        await pool.query(
          `
          UPDATE users
          SET role = 'admin'
          WHERE id = $1
          `,
          [user.id]
        );

        user.role = "admin";

      }


      req.session.user =
        publicUser(user);


      res.json({
        message:
          "Logged in successfully.",
        user:
          req.session.user
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not log in."
      });

    }

  }
);


/* =========================
   LOGOUT
========================= */

app.post(
  "/api/logout",
  (req, res) => {

    req.session.destroy(
      () => {

        res.json({
          message:
            "Logged out."
        });

      }
    );

  }
);


/* =========================
   CURRENT USER
========================= */

app.get(
  "/api/me",
  (req, res) => {

    res.json({
      user:
        req.session.user ||
        null
    });

  }
);


/* =========================
   PUBLIC STORIES
========================= */

app.get(
  "/api/stories",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            title,
            genre,
            description,
            content,
            price,
            cover_url,
            is_published,
            created_at,
            updated_at
          FROM stories
          WHERE is_published = true
          ORDER BY created_at DESC
          `
        );


      const stories =
        result.rows.map(
          story => ({

            ...story,

            content:
              Number(
                story.price
              ) > 0
                ? undefined
                : story.content

          })
        );


      res.json(stories);


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load stories."
      });

    }

  }
);


/* =========================
   SINGLE STORY
========================= */

app.get(
  "/api/stories/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT *
          FROM stories
          WHERE id = $1
          AND is_published = true
          `,
          [req.params.id]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          message:
            "Story not found."
        });

      }


      const story =
        result.rows[0];


      let unlocked =
        Number(
          story.price
        ) <= 0;


      if (req.session.user) {

        const purchase =
          await pool.query(
            `
            SELECT id
            FROM purchases
            WHERE user_id = $1
            AND story_id = $2
            AND status = 'paid'
            `,
            [
              req.session.user.id,
              story.id
            ]
          );


        if (purchase.rowCount) {

          unlocked = true;

        }

      }


      res.json({

        id: story.id,

        title:
          story.title,

        genre:
          story.genre,

        description:
          story.description,

        price:
          story.price,

        cover_url:
          story.cover_url,

        is_published:
          story.is_published,

        unlocked,

        content:
          unlocked
            ? story.content
            : null

      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load story."
      });

    }

  }
);


/* =========================
   DEMO PURCHASE
========================= */

app.post(
  "/api/stories/:id/purchase-demo",
  requireLogin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT id, price
          FROM stories
          WHERE id = $1
          AND is_published = true
          `,
          [req.params.id]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          message:
            "Story not found."
        });

      }


      const story =
        result.rows[0];


      await pool.query(
        `
        INSERT INTO purchases
        (
          user_id,
          story_id,
          amount,
          provider,
          status
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'demo',
          'paid'
        )
        ON CONFLICT
        (
          user_id,
          story_id
        )
        DO UPDATE SET
          status = 'paid'
        `,
        [
          req.session.user.id,
          story.id,
          story.price
        ]
      );


      res.json({
        message:
          "Demo purchase completed.",
        storyId:
          story.id
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Purchase failed."
      });

    }

  }
);


/* =========================
   ADMIN — ALL STORIES
========================= */

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
          ORDER BY created_at DESC
          `
        );


      res.json(
        result.rows
      );


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load admin stories."
      });

    }

  }
);


/* =========================
   ADMIN — CREATE STORY
========================= */

app.post(
  "/api/admin/stories",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        title,
        genre,
        description,
        content,
        price = 0,
        cover_url = "",
        is_published = false
      } = req.body;


      if (
        !title ||
        !genre ||
        !description ||
        !content
      ) {

        return res.status(400).json({
          message:
            "Please complete all required story fields."
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
            price,
            cover_url,
            is_published
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING *
          `,
          [
            String(title).trim(),
            String(genre).trim(),
            String(description).trim(),
            String(content),
            Number(price) || 0,
            String(
              cover_url || ""
            ).trim(),
            Boolean(
              is_published
            )
          ]
        );


      res.status(201).json(
        result.rows[0]
      );


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not save story."
      });

    }

  }
);


/* =========================
   ADMIN — UPDATE STORY
========================= */

app.put(
  "/api/admin/stories/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        title,
        genre,
        description,
        content,
        price = 0,
        cover_url = "",
        is_published = false
      } = req.body;


      if (
        !title ||
        !genre ||
        !description ||
        !content
      ) {

        return res.status(400).json({
          message:
            "Please complete all required story fields."
        });

      }


      const result =
        await pool.query(
          `
          UPDATE stories
          SET
            title = $1,
            genre = $2,
            description = $3,
            content = $4,
            price = $5,
            cover_url = $6,
            is_published = $7,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = $8
          RETURNING *
          `,
          [
            String(title).trim(),
            String(genre).trim(),
            String(description).trim(),
            String(content),
            Number(price) || 0,
            String(
              cover_url || ""
            ).trim(),
            Boolean(
              is_published
            ),
            req.params.id
          ]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          message:
            "Story not found."
        });

      }


      res.json(
        result.rows[0]
      );


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not update story."
      });

    }

  }
);


/* =========================
   ADMIN — DELETE STORY
========================= */

app.delete(
  "/api/admin/stories/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          DELETE FROM stories
          WHERE id = $1
          RETURNING id
          `,
          [req.params.id]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          message:
            "Story not found."
        });

      }


      res.json({
        message:
          "Story deleted."
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not delete story."
      });

    }

  }
);


/* =========================
   ADMIN PAGE
========================= */

app.get(
  "/admin",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );

  }
);


/* =========================
   WEBSITE
========================= */

app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/* =========================
   START SERVER
========================= */

initDatabase()
  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log(
          `Epshitah Stories running on port ${PORT}`
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
