EPSHITAH STORIES - PostgreSQL backend update

Replace ONLY server.js and package.json in the GitHub repository.

Render must already have DATABASE_URL set to the PostgreSQL database.
Do not delete or change DATABASE_URL.

After uploading the two files, Render will deploy automatically.
This version keeps the existing login, stories, chapters, publishing, videos and admin API routes, but stores data in PostgreSQL instead of SQLite.
