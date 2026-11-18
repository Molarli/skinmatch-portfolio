-- =====================================================================
-- SkinMatch : A Personalized Skincare Recommendation System
-- CSS325 Database Systems, Project 2
-- 01_schema.sql : create the database, all tables, keys, constraints, indexes
--
-- Run order (MySQL Workbench, admin/root login):
--   01_schema.sql -> 02_views_routines.sql -> 03_data.sql -> 04_accounts.sql
--   05_demo_queries.sql is for the presentation (run statement by statement)
-- Running this file again RESETS everything, so run 02, 03, 04 again after it.
-- Tested target: MySQL 8.0.16 or newer (CHECK constraints are enforced from 8.0.16)
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS skinmatch;
CREATE DATABASE skinmatch
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE skinmatch;

-- ---------------------------------------------------------------------
-- 1. USER  (Project 1 entity USER; named "users" because USER is a MySQL keyword)
--    Project 2 extension: role column = the ADMIN role deferred in Project 1
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,          -- scrypt$salt$hash, never the password
  gender         ENUM('female','male','other') NULL,
  birth_date     DATE NULL,
  phone          VARCHAR(20) NULL,
  role           ENUM('member','admin') NOT NULL DEFAULT 'member',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
);

-- ---------------------------------------------------------------------
-- 2. SKIN_PROFILE  (weak entity, 1:1 with USER)
--    UNIQUE(user_id) keeps the HAS relationship 1:1
--    ON DELETE CASCADE: the profile cannot exist without its owner
-- ---------------------------------------------------------------------
CREATE TABLE skin_profile (
  profile_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  skin_type   ENUM('dry','oily','combination','sensitive','normal') NOT NULL,
  skin_tone   ENUM('fair','light','medium','tan','deep') NULL,
  age_group   ENUM('under18','18-24','25-34','35-44','45plus') NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_profile_user UNIQUE (user_id),
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. SKIN_CONCERN  (standard vocabulary shared by profiles and products)
-- ---------------------------------------------------------------------
CREATE TABLE skin_concern (
  concern_id    INT AUTO_INCREMENT PRIMARY KEY,
  concern_name  VARCHAR(50)  NOT NULL,
  name_th       VARCHAR(50)  NOT NULL,           -- label shown in the Thai UI
  description   VARCHAR(255) NULL,
  CONSTRAINT uq_concern_name UNIQUE (concern_name)
);

-- ---------------------------------------------------------------------
-- 4. BRAND
-- ---------------------------------------------------------------------
CREATE TABLE brand (
  brand_id           INT AUTO_INCREMENT PRIMARY KEY,
  brand_name         VARCHAR(100) NOT NULL,
  country_of_origin  VARCHAR(50)  NULL,
  website            VARCHAR(255) NULL,
  CONSTRAINT uq_brand_name UNIQUE (brand_name)
);

-- ---------------------------------------------------------------------
-- 5. PRODUCT  (superclass of the EER specialization, see 12-14)
--    ON DELETE RESTRICT on brand: a brand that still has products cannot be deleted
-- ---------------------------------------------------------------------
CREATE TABLE product (
  product_id     INT AUTO_INCREMENT PRIMARY KEY,
  product_name   VARCHAR(150) NOT NULL,
  brand_id       INT NOT NULL,
  category       ENUM('cleanser','toner','serum','moisturizer','sunscreen','mask') NOT NULL,
  price          DECIMAL(8,2) NOT NULL,
  volume_ml      INT NULL,
  gender_target  ENUM('female','male','unisex') NOT NULL DEFAULT 'unisex',
  CONSTRAINT chk_product_price  CHECK (price > 0),
  CONSTRAINT chk_product_volume CHECK (volume_ml IS NULL OR volume_ml > 0),
  CONSTRAINT fk_product_brand FOREIGN KEY (brand_id)
    REFERENCES brand (brand_id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 6. INGREDIENT  (is_allergen supports allergen filtering)
-- ---------------------------------------------------------------------
CREATE TABLE ingredient (
  ingredient_id     INT AUTO_INCREMENT PRIMARY KEY,
  ingredient_name   VARCHAR(100) NOT NULL,
  name_th           VARCHAR(100) NULL,
  function_benefit  VARCHAR(255) NULL,
  is_allergen       BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_ingredient_name UNIQUE (ingredient_name)
);

-- ---------------------------------------------------------------------
-- 7. REVIEW  (associative entity USER - PRODUCT)
--    UNIQUE(user_id, product_id): one review per user per product
-- ---------------------------------------------------------------------
CREATE TABLE review (
  review_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  product_id   INT NOT NULL,
  rating       TINYINT NOT NULL,
  comment      VARCHAR(500) NULL,
  review_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id),
  CONSTRAINT fk_review_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_review_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 8. RECOMMENDATION  (associative entity, a log of what was recommended)
-- ---------------------------------------------------------------------
CREATE TABLE recommendation (
  recommendation_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL,
  product_id         INT NOT NULL,
  match_score        DECIMAL(5,2) NOT NULL,
  recommended_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_reco_score CHECK (match_score BETWEEN 0 AND 100),
  CONSTRAINT fk_reco_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_reco_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 9-11. The three M:N bridge tables from Project 1
-- ---------------------------------------------------------------------
CREATE TABLE skin_profile_concern (
  profile_id      INT NOT NULL,
  concern_id      INT NOT NULL,
  severity_level  TINYINT NOT NULL DEFAULT 2,     -- 1 = mild, 2 = moderate, 3 = severe
  PRIMARY KEY (profile_id, concern_id),
  CONSTRAINT chk_spc_severity CHECK (severity_level BETWEEN 1 AND 3),
  CONSTRAINT fk_spc_profile FOREIGN KEY (profile_id)
    REFERENCES skin_profile (profile_id) ON DELETE CASCADE,
  CONSTRAINT fk_spc_concern FOREIGN KEY (concern_id)
    REFERENCES skin_concern (concern_id) ON DELETE RESTRICT
);

CREATE TABLE product_ingredient (
  product_id             INT NOT NULL,
  ingredient_id          INT NOT NULL,
  concentration_percent  DECIMAL(5,2) NULL,       -- NULL = not disclosed by the brand
  PRIMARY KEY (product_id, ingredient_id),
  CONSTRAINT chk_pi_conc CHECK (concentration_percent IS NULL
                                OR concentration_percent BETWEEN 0 AND 100),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredient (ingredient_id) ON DELETE RESTRICT
);

CREATE TABLE product_concern (
  product_id           INT NOT NULL,
  concern_id           INT NOT NULL,
  effectiveness_level  TINYINT NOT NULL DEFAULT 2, -- 1 = low, 2 = medium, 3 = high
  PRIMARY KEY (product_id, concern_id),
  CONSTRAINT chk_pc_eff CHECK (effectiveness_level BETWEEN 1 AND 3),
  CONSTRAINT fk_pc_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_concern FOREIGN KEY (concern_id)
    REFERENCES skin_concern (concern_id) ON DELETE RESTRICT
);

-- =====================================================================
-- Project 2 revisions (explained in the final report, section 3)
-- =====================================================================

-- R1. SKIN_PROFILE_ALLERGEN: M:N "AVOIDS" between SKIN_PROFILE and INGREDIENT.
--     Needed for allergen-exclusion: each user lists the ingredients they react to.
CREATE TABLE skin_profile_allergen (
  profile_id     INT NOT NULL,
  ingredient_id  INT NOT NULL,
  PRIMARY KEY (profile_id, ingredient_id),
  CONSTRAINT fk_spa_profile FOREIGN KEY (profile_id)
    REFERENCES skin_profile (profile_id) ON DELETE CASCADE,
  CONSTRAINT fk_spa_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredient (ingredient_id) ON DELETE RESTRICT
);

-- R2. PRODUCT_SKIN_TYPE: the skin types a product is suitable for.
--     A product suits several skin types, so storing them in one column would break 1NF.
CREATE TABLE product_skin_type (
  product_id  INT NOT NULL,
  skin_type   ENUM('dry','oily','combination','sensitive','normal') NOT NULL,
  PRIMARY KEY (product_id, skin_type),
  CONSTRAINT fk_pst_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

-- R3. EER specialization of PRODUCT (deferred in Project 1).
--     Disjoint, partial: a product is at most one subtype; cleanser/toner/mask have none.
--     Mapping option: one table per subclass, PK = FK to the superclass.
--     The triggers in 02_views_routines.sql check that category matches the subtype.
CREATE TABLE moisturizer (
  product_id  INT PRIMARY KEY,
  texture     ENUM('gel','lotion','cream','balm') NOT NULL,
  finish      ENUM('matte','natural','dewy') NOT NULL,
  CONSTRAINT fk_moist_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

CREATE TABLE serum (
  product_id      INT PRIMARY KEY,
  key_active      VARCHAR(100) NOT NULL,
  active_percent  DECIMAL(5,2) NULL,
  CONSTRAINT chk_serum_pct CHECK (active_percent IS NULL OR active_percent BETWEEN 0 AND 100),
  CONSTRAINT fk_serum_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

CREATE TABLE sunscreen (
  product_id   INT PRIMARY KEY,
  spf          SMALLINT NOT NULL,
  pa_rating    ENUM('PA+','PA++','PA+++','PA++++') NOT NULL,
  filter_type  ENUM('chemical','physical','hybrid') NOT NULL,
  CONSTRAINT chk_sun_spf CHECK (spf BETWEEN 1 AND 100),
  CONSTRAINT fk_sun_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

-- R4. PRODUCT_PRICE_LOG: audit table written ONLY by trigger trg_product_price_audit
CREATE TABLE product_price_log (
  log_id      INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  old_price   DECIMAL(8,2) NOT NULL,
  new_price   DECIMAL(8,2) NOT NULL,
  changed_by  VARCHAR(255) NOT NULL,
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_product FOREIGN KEY (product_id)
    REFERENCES product (product_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Indexes (PRIMARY, UNIQUE and FOREIGN KEY columns are indexed already)
-- The catalogue page filters by category and sorts/filters by price.
-- ---------------------------------------------------------------------
CREATE INDEX idx_product_category_price ON product (category, price);
CREATE INDEX idx_reco_user_date ON recommendation (user_id, recommended_date);

SHOW TABLES;
