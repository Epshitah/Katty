# Epshitah Stories — Complete Restore

This package contains the complete public site and private Author Dashboard.

## Features
- Purple responsive public website
- Search and genres
- Stories and reader view
- Sign up / login / logout
- Admin dashboard
- Add, edit, delete, publish and unpublish stories
- Add, edit and delete videos
- SQLite database
- No prices, purchases or payment system

## Render
Build command: `npm install`
Start command: `node server.js`

Optional environment variables:
- `ADMIN_EMAIL` — admin email; defaults to `ralejoemolebatsi189@gmail.com`
- `SESSION_SECRET` — change this to a long random secret
- `DB_PATH` — optional SQLite database path

Important: Render's normal filesystem can be reset on redeploy/restart. For permanent database data, add a Render persistent disk or move the database to a hosted database later.
