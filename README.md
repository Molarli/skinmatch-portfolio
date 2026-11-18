# SkinMatch

**[Live Demo](https://molarli.github.io/skinmatch-portfolio/)** — Try a skin profile, filter ingredients, and see ranked matches from a fictional catalog. The demo runs in your browser.

A team-built skincare recommendation app built with Node.js, Express, and MySQL 8. A stored function scores products against a user’s skin profile and excludes products containing their flagged ingredients.

## What is in this folder
```
sql/01_schema.sql          tables, keys, CHECK/UNIQUE/FK constraints, indexes (17 tables)
sql/02_views_routines.sql  4 views, 2 functions, 2 procedures, 5 triggers
sql/03_data.sql            sample data (9 brands, 18 products, 27 ingredients, 9 users, 29 reviews ...)
sql/04_accounts.sql        MySQL roles + least-privilege accounts (app, report, editor)
sql/05_demo_queries.sql    every required SQL feature, grouped in 13 sections, for the demo
server.js, db.js           Express app and the single connection pool
routes/ controllers/       API: auth, meta, products, me (profile/recommendations), admin
middleware/auth.js         requireLogin, requireRole('admin')
utils/                     scrypt password hashing, small HTTP helpers
public/                    the web page (index.html, app.js, style.css)
requests.http              ready-made API calls for testing
```

## How to run (Mac or Windows)
1. **Database** - open MySQL Workbench with your root/admin login and run, in this order:
   `sql/01_schema.sql` → `sql/02_views_routines.sql` → `sql/03_data.sql` → `sql/04_accounts.sql`
   (or in a terminal: `mysql -u root -p < sql/01_schema.sql`, and so on).
   Running 01 again resets everything, so then run 02, 03 and 04 again.
2. **App** - in a terminal inside this folder:
   ```
   npm install        # once: express, mysql2, dotenv, express-session
   npm run dev        # http://localhost:3000
   ```
   `.env` already contains the `skinmatch_app` login created by `04_accounts.sql`.
3. Open http://localhost:3000

## Demo logins
| Who | Email | Password |
|---|---|---|
| Member (oily skin, allergic to fragrance) | member1@example.com | member1234 |
| Member (sensitive skin, 3 allergens) | member3@example.com | member1234 |
| Member with no profile yet | new-member@example.com | member1234 |
| Admin | demo-admin@example.com | admin1234 |

## Troubleshooting
- *"Access denied for user 'skinmatch_app'"*: run `sql/04_accounts.sql` again. If your MySQL only accepts
  TCP logins, change `localhost` to `127.0.0.1` in `.env` **and** in `04_accounts.sql`, then run it again.
- *Error 1418 when creating functions*: you are not on the admin login, or run
  `SET GLOBAL log_bin_trust_function_creators = 1;` once as root.
- *Error 3819 / CHECK not enforced*: MySQL must be 8.0.16 or newer (`SELECT VERSION();`).

The seed accounts and profiles are fictional and intended for local demos only. Set your own database passwords in a local copy of the setup SQL and use the app password in your local .env.
