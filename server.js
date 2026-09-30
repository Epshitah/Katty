const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const path = require("path");
const crypto = require("crypto");

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

  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

app.use(express.json({ limit: "2mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb"
  })
);

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),

    secret:
      process.env.SESSION_SECRET ||
      "epshitah-change-this-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",

      maxAge:
        7 * 24 * 60 * 60 * 1000
    }
  })
);


/* =========================================================
   HELPERS
========================================================= */

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


async function getCurrentUser(req) {

  if (!req.session.userEmail) {
    return null;
  }

  const result =
    await pool.query(
      `
      SELECT
        id,
        name,
        email,
        created_at AS "createdAt"

      FROM users

      WHERE email = $1
      `,
      [req.session.userEmail]
    );

  return result.rows[0] || null;

}


function requireAdmin(req, res, next) {

  if (!req.session.isAdmin) {

    return res.status(401).json({
      message:
        "Admin login required."
    });

  }

  next();

}


/* =========================================================
   DATABASE SETUP
========================================================= */

async function setupDatabase() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (

      id SERIAL PRIMARY KEY,

      name TEXT NOT NULL,

      email TEXT UNIQUE NOT NULL,

      password TEXT NOT NULL,

      created_at
        TIMESTAMPTZ
        DEFAULT NOW()

    )
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (

      id SERIAL PRIMARY KEY,

      title TEXT NOT NULL,

      category TEXT
        DEFAULT 'STORY',

      description TEXT
        DEFAULT '',

      content TEXT NOT NULL,

      cover_url TEXT
        DEFAULT '',

      video_url TEXT
        DEFAULT '',

      created_at
        TIMESTAMPTZ
        DEFAULT NOW()

    )
  `);


  /* SAFE MIGRATIONS
     These do not delete existing stories.
  */

  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS
    cover_url TEXT DEFAULT ''
  `);


  await pool.query(`
    ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS
    video_url TEXT DEFAULT ''
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_stories (

      id SERIAL PRIMARY KEY,

      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      story_id INTEGER NOT NULL
        REFERENCES stories(id)
        ON DELETE CASCADE,

      created_at
        TIMESTAMPTZ
        DEFAULT NOW(),

      UNIQUE(user_id, story_id)

    )
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS author_profiles (

      id INTEGER PRIMARY KEY DEFAULT 1,

      name TEXT
        DEFAULT 'Epshitah Stories',

      genre TEXT
        DEFAULT '',

      bio TEXT
        DEFAULT '',

      photo_url TEXT
        DEFAULT '',

      updated_at
        TIMESTAMPTZ
        DEFAULT NOW()

    )
  `);


  await pool.query(`
    INSERT INTO author_profiles (id)

    VALUES (1)

    ON CONFLICT (id)
    DO NOTHING
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (

      setting_key TEXT PRIMARY KEY,

      setting_value TEXT
        NOT NULL
        DEFAULT ''

    )
  `);


  console.log(
    "Database tables and migrations are ready."
  );

}


/* =========================================================
   READER SIGN UP
========================================================= */

app.post(
  "/api/signup",
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        cleanEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );


      if (
        !name ||
        !email ||
        !password
      ) {

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
          `
          SELECT id

          FROM users

          WHERE email = $1
          `,
          [email]
        );


      if (existing.rows.length) {

        return res.status(400).json({
          message:
            "An account with this email already exists."
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO users
          (
            name,
            email,
            password
          )

          VALUES
          (
            $1,
            $2,
            $3
          )

          RETURNING
            id,
            name,
            email,
            created_at AS "createdAt"
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


      req.session.save(error => {

        if (error) {

          console.error(error);

          return res.status(500).json({
            message:
              "Account created, but the session could not be saved."
          });

        }


        res.json({

          message:
            "Account created successfully!",

          user

        });

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not create the account."
      });

    }

  }
);


/* =========================================================
   READER LOGIN
========================================================= */

app.post(
  "/api/login",
  async (req, res) => {

    try {

      const email =
        cleanEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );


      if (
        !email ||
        !password
      ) {

        return res.status(400).json({
          message:
            "Please enter your email and password."
        });

      }


      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            password,
            created_at AS "createdAt"

          FROM users

          WHERE email = $1
          `,
          [email]
        );


      if (!result.rows.length) {

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


      req.session.save(error => {

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

            name:
              user.name,

            email:
              user.email,

            createdAt:
              user.createdAt

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

  }
);


/* =========================================================
   CURRENT READER
========================================================= */

app.get(
  "/api/me",
  async (req, res) => {

    try {

      const user =
        await getCurrentUser(req);


      if (!user) {

        return res.json({
          loggedIn: false
        });

      }


      res.json({

        loggedIn: true,

        user

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        loggedIn: false
      });

    }

  }
);


/* =========================================================
   READER LOGOUT
========================================================= */

app.post(
  "/api/logout",
  (req, res) => {

    req.session.destroy(() => {

      res.clearCookie(
        "connect.sid"
      );

      res.json({
        message:
          "Logged out successfully."
      });

    });

  }
);


/* =========================================================
   STORY SELECT
========================================================= */

const storySelect = `

  id,

  title,

  category,

  description,

  content,

  cover_url AS "coverUrl",

  video_url AS "videoUrl",

  created_at AS "createdAt"

`;


/* =========================================================
   GET ALL STORIES
========================================================= */

app.get(
  "/api/stories",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            ${storySelect}

          FROM stories

          ORDER BY id DESC
          `
        );


      res.json(
        result.rows
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load stories."
      });

    }

  }
);


/* =========================================================
   GET ONE STORY
========================================================= */

app.get(
  "/api/stories/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            ${storySelect}

          FROM stories

          WHERE id = $1
          `,
          [
            Number(
              req.params.id
            )
          ]
        );


      if (!result.rows.length) {

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
          "Could not load the story."
      });

    }

  }
);


/* =========================================================
   SAVED STORIES
========================================================= */

app.get(
  "/api/saved-stories",
  async (req, res) => {

    try {

      const user =
        await getCurrentUser(req);


      if (!user) {

        return res.status(401).json({
          message:
            "Please log in first."
        });

      }


      const result =
        await pool.query(
          `
          SELECT
            ${storySelect}

          FROM saved_stories ss

          JOIN stories s
          ON s.id = ss.story_id

          WHERE ss.user_id = $1

          ORDER BY
            ss.created_at DESC
          `,
          [user.id]
        );


      res.json(
        result.rows
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load your library."
      });

    }

  }
);


/* =========================================================
   SAVE STORY
========================================================= */

app.post(
  "/api/saved-stories/:storyId",
  async (req, res) => {

    try {

      const user =
        await getCurrentUser(req);


      if (!user) {

        return res.status(401).json({
          message:
            "Please log in to save stories."
        });

      }


      const storyId =
        Number(
          req.params.storyId
        );


      await pool.query(
        `
        INSERT INTO saved_stories
        (
          user_id,
          story_id
        )

        VALUES
        (
          $1,
          $2
        )

        ON CONFLICT
        (
          user_id,
          story_id
        )

        DO NOTHING
        `,
        [
          user.id,
          storyId
        ]
      );


      res.json({
        message:
          "Story saved to your library."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not save the story."
      });

    }

  }
);


/* =========================================================
   REMOVE SAVED STORY
========================================================= */

app.delete(
  "/api/saved-stories/:storyId",
  async (req, res) => {

    try {

      const user =
        await getCurrentUser(req);


      if (!user) {

        return res.status(401).json({
          message:
            "Please log in first."
        });

      }


      await pool.query(
        `
        DELETE FROM saved_stories

        WHERE user_id = $1

        AND story_id = $2
        `,
        [
          user.id,

          Number(
            req.params.storyId
          )
        ]
      );


      res.json({
        message:
          "Story removed from your library."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not remove the story."
      });

    }

  }
);


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {

    const email =
      cleanEmail(
        req.body.email
      );

    const password =
      String(
        req.body.password || ""
      );


    if (!ADMIN_PASSWORD) {

      return res.status(500).json({
        message:
          "Admin password has not been configured on the server."
      });

    }


    if (
      email !==
        cleanEmail(ADMIN_EMAIL) ||
      password !==
        ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        message:
          "Admin email or password is incorrect."
      });

    }


    req.session.isAdmin =
      true;

    req.session.adminEmail =
      ADMIN_EMAIL;


    req.session.save(error => {

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

  }
);


/* =========================================================
   CHECK ADMIN
========================================================= */

app.get(
  "/api/admin/me",
  (req, res) => {

    res.json({

      loggedIn:
        !!req.session.isAdmin,

      email:
        req.session.adminEmail ||
        ""

    });

  }
);


/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post(
  "/api/admin/logout",
  (req, res) => {

    req.session.destroy(() => {

      res.clearCookie(
        "connect.sid"
      );

      res.json({
        message:
          "Admin logged out."
      });

    });

  }
);


/* =========================================================
   ADD STORY
========================================================= */

app.post(
  "/api/admin/stories",
  requireAdmin,
  async (req, res) => {

    try {

      const title =
        String(
          req.body.title || ""
        ).trim();

      const category =
        String(
          req.body.category ||
          "STORY"
        ).trim();

      const description =
        String(
          req.body.description ||
          ""
        ).trim();

      const content =
        String(
          req.body.content ||
          ""
        ).trim();

      const coverUrl =
        String(
          req.body.coverUrl ||
          ""
        ).trim();

      const videoUrl =
        String(
          req.body.videoUrl ||
          ""
        ).trim();


      if (
        !title ||
        !content
      ) {

        return res.status(400).json({
          message:
            "Story title and story content are required."
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO stories
          (
            title,
            category,
            description,
            content,
            cover_url,
            video_url
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )

          RETURNING
            ${storySelect}
          `,
          [
            title,
            category,
            description,
            content,
            coverUrl,
            videoUrl
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

  }
);


/* =========================================================
   EDIT STORY
========================================================= */

app.put(
  "/api/admin/stories/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );

      const title =
        String(
          req.body.title || ""
        ).trim();

      const category =
        String(
          req.body.category ||
          "STORY"
        ).trim();

      const description =
        String(
          req.body.description ||
          ""
        ).trim();

      const content =
        String(
          req.body.content ||
          ""
        ).trim();

      const coverUrl =
        String(
          req.body.coverUrl ||
          ""
        ).trim();

      const videoUrl =
        String(
          req.body.videoUrl ||
          ""
        ).trim();


      if (
        !Number.isInteger(id) ||
        !title ||
        !content
      ) {

        return res.status(400).json({
          message:
            "Story ID, title and content are required."
        });

      }


      const result =
        await pool.query(
          `
          UPDATE stories

          SET
            title = $1,
            category = $2,
            description = $3,
            content = $4,
            cover_url = $5,
            video_url = $6

          WHERE id = $7

          RETURNING
            ${storySelect}
          `,
          [
            title,
            category,
            description,
            content,
            coverUrl,
            videoUrl,
            id
          ]
        );


      if (!result.rows.length) {

        return res.status(404).json({
          message:
            "Story not found."
        });

      }


      res.json({

        message:
          "Story updated successfully!",

        story:
          result.rows[0]

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not update the story."
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

          WHERE id = $1

          RETURNING id
          `,
          [
            Number(
              req.params.id
            )
          ]
        );


      if (!result.rows.length) {

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

  }
);


/* =========================================================
   AUTHOR PROFILE
========================================================= */

app.get(
  "/api/admin/profile",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            name,
            genre,
            bio,
            photo_url AS "photoUrl"

          FROM author_profiles

          WHERE id = 1
          `
        );


      res.json(
        result.rows[0] || {

          name:
            "Epshitah Stories",

          genre:
            "",

          bio:
            "",

          photoUrl:
            ""

        }
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load author profile."
      });

    }

  }
);


/* =========================================================
   SAVE AUTHOR PROFILE
========================================================= */

app.put(
  "/api/admin/profile",
  requireAdmin,
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name ||
          ""
        ).trim();

      const genre =
        String(
          req.body.genre ||
          ""
        ).trim();

      const bio =
        String(
          req.body.bio ||
          ""
        ).trim();

      const photoUrl =
        String(
          req.body.photoUrl ||
          ""
        ).trim();


      await pool.query(
        `
        INSERT INTO author_profiles
        (
          id,
          name,
          genre,
          bio,
          photo_url,
          updated_at
        )

        VALUES
        (
          1,
          $1,
          $2,
          $3,
          $4,
          NOW()
        )

        ON CONFLICT (id)

        DO UPDATE SET

          name =
            EXCLUDED.name,

          genre =
            EXCLUDED.genre,

          bio =
            EXCLUDED.bio,

          photo_url =
            EXCLUDED.photo_url,

          updated_at =
            NOW()
        `,
        [
          name ||
            "Epshitah Stories",

          genre,

          bio,

          photoUrl
        ]
      );


      res.json({
        message:
          "Author profile saved successfully."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not save author profile."
      });

    }

  }
);


/* =========================================================
   PUBLIC AUTHOR PROFILE
========================================================= */

app.get(
  "/api/author-profile",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            name,
            genre,
            bio,
            photo_url AS "photoUrl"

          FROM author_profiles

          WHERE id = 1
          `
        );


      res.json(
        result.rows[0] || {

          name:
            "Epshitah Stories",

          genre:
            "",

          bio:
            "",

          photoUrl:
            ""

        }
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load author profile."
      });

    }

  }
);


/* =========================================================
   FEATURED STORY
========================================================= */

app.get(
  "/api/featured",
  async (req, res) => {

    try {

      const setting =
        await pool.query(
          `
          SELECT
            setting_value

          FROM site_settings

          WHERE setting_key =
            'featured_story_id'
          `
        );


      const id =
        setting.rows[0]
          ?.setting_value;


      if (!id) {

        return res.json(null);

      }


      const result =
        await pool.query(
          `
          SELECT
            ${storySelect}

          FROM stories

          WHERE id = $1
          `,
          [
            Number(id)
          ]
        );


      res.json(
        result.rows[0] || null
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not load featured story."
      });

    }

  }
);


/* =========================================================
   SET FEATURED STORY
========================================================= */

app.put(
  "/api/admin/featured",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        req.body.storyId
          ? String(
              req.body.storyId
            )
          : "";


      if (id) {

        const exists =
          await pool.query(
            `
            SELECT id

            FROM stories

            WHERE id = $1
            `,
            [
              Number(id)
            ]
          );


        if (!exists.rows.length) {

          return res.status(404).json({
            message:
              "Story not found."
          });

        }

      }


      await pool.query(
        `
        INSERT INTO site_settings
        (
          setting_key,
          setting_value
        )

        VALUES
        (
          'featured_story_id',
          $1
        )

        ON CONFLICT
        (
          setting_key
        )

        DO UPDATE SET

          setting_value =
            EXCLUDED.setting_value
        `,
        [id]
      );


      res.json({
        message:
          id
            ? "Featured story updated."
            : "Featured story cleared."
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Could not update featured story."
      });

    }

  }
);


/* =========================================================
   PAGES
========================================================= */

app.get(
  "/signup",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "signup.html"
      )
    );

  }
);


app.get(
  "/admin",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "admin.html"
      )
    );

  }
);


/* =========================================================
   STATIC WEBSITE
========================================================= */

app.use(
  express.static(
    __dirname
  )
);


/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

  try {

    await setupDatabase();


    app.listen(
      PORT,
      () => {

        console.log(
          `Epshitah Stories running on port ${PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      "Could not start server:",
      error
    );

    process.exit(1);

  }

}


startServer();
