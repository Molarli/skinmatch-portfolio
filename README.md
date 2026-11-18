# SkinMatch

A team-built skincare recommendation web app using Node.js, Express, and MySQL 8. It ranks products against a user’s skin profile and filters out products that contain ingredients the user has flagged. The database uses 17 tables, 4 views, 2 functions, 2 stored procedures, and 5 triggers.

## Troubleshooting
- *"Access denied for user 'skinmatch_app'"*: run `sql/04_accounts.sql` again. If your MySQL only accepts
  TCP logins, change `localhost` to `127.0.0.1` in `.env` **and** in `04_accounts.sql`, then run it again.
- *Error 1418 when creating functions*: you are not on the admin login, or run
  `SET GLOBAL log_bin_trust_function_creators = 1;` once as root.
- *Error 3819 / CHECK not enforced*: MySQL must be 8.0.16 or newer (`SELECT VERSION();`).
