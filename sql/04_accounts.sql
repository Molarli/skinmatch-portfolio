-- =====================================================================
-- SkinMatch, Project 2
-- 04_accounts.sql : MySQL accounts, roles and privileges (access control)
-- Run as admin/root after 01-03. Safe to run again.
--
-- Two different kinds of "user" in this project:
--   * App users (members, admins) are ROWS in the users table, with a scrypt hash.
--   * MySQL accounts below are for PROGRAMS, one account per job (least privilege).
-- =====================================================================

USE skinmatch;

-- ---------------------------------------------------------------------
-- 1. Roles: a named bundle of privileges (SQL standard, MySQL 8)
-- ---------------------------------------------------------------------
DROP ROLE IF EXISTS 'sm_reader', 'sm_writer', 'sm_executor';
CREATE ROLE 'sm_reader', 'sm_writer', 'sm_executor';

GRANT SELECT                 ON skinmatch.* TO 'sm_reader';
GRANT INSERT, UPDATE, DELETE ON skinmatch.* TO 'sm_writer';
GRANT EXECUTE                ON skinmatch.* TO 'sm_executor';  -- CALL procedures, use functions

-- ---------------------------------------------------------------------
-- 2. The web application's account: rows + routines, never CREATE / DROP / ALTER.
--    Even a successful SQL injection could not destroy the schema.
-- ---------------------------------------------------------------------
DROP USER IF EXISTS 'skinmatch_app'@'localhost';
CREATE USER 'skinmatch_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_SKINMATCH_APP!';
GRANT 'sm_reader', 'sm_writer', 'sm_executor' TO 'skinmatch_app'@'localhost';
SET DEFAULT ROLE ALL TO 'skinmatch_app'@'localhost';           -- roles active at login

-- The audit log must only be written by the trigger, so the app may read it but not
-- change it. MySQL has no column/table "deny", so we keep the app's writer role and
-- simply never expose a route that writes product_price_log (documented rule).

-- ---------------------------------------------------------------------
-- 3. A read-only reporting account (e.g. for a marketing dashboard):
--    it sees only the public views - no emails, no password hashes, no profiles.
-- ---------------------------------------------------------------------
DROP USER IF EXISTS 'skinmatch_report'@'localhost';
CREATE USER 'skinmatch_report'@'localhost' IDENTIFIED BY 'CHANGE_ME_SKINMATCH_REPORT!';
GRANT SELECT ON skinmatch.v_brand_report    TO 'skinmatch_report'@'localhost';
GRANT SELECT ON skinmatch.v_product_catalog TO 'skinmatch_report'@'localhost';
GRANT SELECT ON skinmatch.v_public_reviews  TO 'skinmatch_report'@'localhost';

-- ---------------------------------------------------------------------
-- 4. A catalogue editor account (e.g. a data-entry staff tool): can read everything
--    but may only change catalogue tables, column-level on product.
-- ---------------------------------------------------------------------
DROP USER IF EXISTS 'skinmatch_editor'@'localhost';
CREATE USER 'skinmatch_editor'@'localhost' IDENTIFIED BY 'CHANGE_ME_SKINMATCH_EDITOR!';
GRANT 'sm_reader' TO 'skinmatch_editor'@'localhost';
SET DEFAULT ROLE ALL TO 'skinmatch_editor'@'localhost';
GRANT INSERT, UPDATE ON skinmatch.brand      TO 'skinmatch_editor'@'localhost';
GRANT INSERT, UPDATE ON skinmatch.ingredient TO 'skinmatch_editor'@'localhost';
GRANT UPDATE (product_name, price, volume_ml) ON skinmatch.product TO 'skinmatch_editor'@'localhost';

-- ---------------------------------------------------------------------
-- 5. Check what each account may do
-- ---------------------------------------------------------------------
SHOW GRANTS FOR 'skinmatch_app'@'localhost';
SHOW GRANTS FOR 'skinmatch_app'@'localhost' USING 'sm_reader', 'sm_writer', 'sm_executor';
SHOW GRANTS FOR 'skinmatch_report'@'localhost';
SHOW GRANTS FOR 'skinmatch_editor'@'localhost';
