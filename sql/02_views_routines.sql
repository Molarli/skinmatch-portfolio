-- =====================================================================
-- SkinMatch, Project 2
-- 02_views_routines.sql : views, stored functions, stored procedures, triggers
-- Run after 01_schema.sql (admin/root login).
-- =====================================================================

SET NAMES utf8mb4;
USE skinmatch;

-- =====================================================================
-- PART A. VIEWS  (a saved query you can SELECT from like a table)
-- =====================================================================

-- A1. Product catalogue: product + brand + rating summary + allergen count.
--     LEFT JOIN keeps products that have no review yet (avg_rating = NULL).
--     The allergen count is a correlated subquery (nested query inside a view).
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT  p.product_id,
        p.product_name,
        p.category,
        p.price,
        p.volume_ml,
        p.gender_target,
        b.brand_id,
        b.brand_name,
        ROUND(AVG(r.rating), 1)      AS avg_rating,
        COUNT(r.review_id)           AS review_count,
        (SELECT COUNT(*)
           FROM product_ingredient pi
           JOIN ingredient i ON i.ingredient_id = pi.ingredient_id
          WHERE pi.product_id = p.product_id
            AND i.is_allergen = TRUE)  AS allergen_count
FROM    product p
JOIN    brand  b ON b.brand_id = p.brand_id
LEFT JOIN review r ON r.product_id = p.product_id
GROUP BY p.product_id, p.product_name, p.category, p.price, p.volume_ml,
         p.gender_target, b.brand_id, b.brand_name;

-- A2. Brand report for the admin page and the read-only report account.
--     Ratings are averaged per product first (derived table) so a product with many
--     reviews does not count many times in AVG(price).
CREATE OR REPLACE VIEW v_brand_report AS
SELECT  b.brand_id,
        b.brand_name,
        b.country_of_origin,
        COUNT(p.product_id)                AS product_count,
        ROUND(AVG(p.price), 2)             AS avg_price,
        MIN(p.price)                       AS min_price,
        MAX(p.price)                       AS max_price,
        ROUND(AVG(rs.avg_rating), 2)       AS avg_rating,
        COALESCE(SUM(rs.n_reviews), 0)     AS total_reviews
FROM    brand b
LEFT JOIN product p ON p.brand_id = b.brand_id
LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS n_reviews
             FROM review
            GROUP BY product_id) rs ON rs.product_id = p.product_id
GROUP BY b.brand_id, b.brand_name, b.country_of_origin;

-- A3. Public reviews: shows only the reviewer's first name, never email or user_id.
--     This is what the product page and the report account are allowed to see.
CREATE OR REPLACE VIEW v_public_reviews AS
SELECT  r.review_id,
        r.product_id,
        SUBSTRING_INDEX(u.full_name, ' ', 1) AS reviewer,
        r.rating,
        r.comment,
        r.review_date
FROM    review r
JOIN    users  u ON u.user_id = r.user_id;

-- A4. One row per member with their profile and concerns (admin "users" page).
--     GROUP_CONCAT turns the bridge rows back into one readable text column.
CREATE OR REPLACE VIEW v_user_profile_summary AS
SELECT  u.user_id,
        u.full_name,
        u.email,
        u.gender,
        u.role,
        sp.skin_type,
        sp.age_group,
        GROUP_CONCAT(sc.name_th ORDER BY spc.severity_level DESC SEPARATOR ', ') AS concerns,
        (SELECT COUNT(*) FROM review rv WHERE rv.user_id = u.user_id) AS review_count
FROM    users u
LEFT JOIN skin_profile sp          ON sp.user_id = u.user_id
LEFT JOIN skin_profile_concern spc ON spc.profile_id = sp.profile_id
LEFT JOIN skin_concern sc          ON sc.concern_id = spc.concern_id
GROUP BY u.user_id, u.full_name, u.email, u.gender, u.role, sp.skin_type, sp.age_group;


-- =====================================================================
-- PART B. STORED FUNCTIONS  (return one value, usable inside SELECT)
-- =====================================================================
DROP FUNCTION  IF EXISTS fn_match_score;
DROP FUNCTION  IF EXISTS fn_avg_rating;
DROP PROCEDURE IF EXISTS sp_generate_recommendations;
DROP PROCEDURE IF EXISTS sp_product_summary;

DELIMITER //

-- B1. fn_match_score(user, product) -> 0..100
--     Score = concern part (max 60) + skin-type part (30) + gender part (10)
--       concern part = 60 * SUM(severity x effectiveness for shared concerns)
--                          / (SUM(severity of all user concerns) x 3)
--                      (30 if the user has no concerns)
--       skin-type part = 30 if the product suits the user's skin type
--       gender part    = 10 if the product is unisex or matches the user's gender
--     If the product contains an ingredient the user is allergic to, the score is 0.
CREATE FUNCTION fn_match_score(p_user INT, p_product INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
  DECLARE v_profile   INT;
  DECLARE v_type      VARCHAR(20);
  DECLARE v_gender    VARCHAR(10);
  DECLARE v_target    VARCHAR(10);
  DECLARE v_total     INT;
  DECLARE v_matched   INT;
  DECLARE v_concern   DECIMAL(6,2);
  DECLARE v_type_pts  INT DEFAULT 0;
  DECLARE v_gen_pts   INT DEFAULT 0;

  SET v_profile = (SELECT profile_id FROM skin_profile WHERE user_id = p_user);
  IF v_profile IS NULL THEN
    RETURN 0;                                   -- no profile yet: nothing to match
  END IF;

  -- allergen rule: any overlap with the user's allergen list means "not suitable"
  IF EXISTS (SELECT 1
               FROM product_ingredient pi
               JOIN skin_profile_allergen spa ON spa.ingredient_id = pi.ingredient_id
              WHERE pi.product_id = p_product
                AND spa.profile_id = v_profile) THEN
    RETURN 0;
  END IF;

  SET v_type   = (SELECT skin_type FROM skin_profile WHERE profile_id = v_profile);
  SET v_gender = (SELECT gender FROM users WHERE user_id = p_user);
  SET v_target = (SELECT gender_target FROM product WHERE product_id = p_product);

  SET v_total = (SELECT COALESCE(SUM(severity_level), 0)
                   FROM skin_profile_concern WHERE profile_id = v_profile);
  SET v_matched = (SELECT COALESCE(SUM(spc.severity_level * pc.effectiveness_level), 0)
                     FROM skin_profile_concern spc
                     JOIN product_concern pc
                       ON pc.concern_id = spc.concern_id AND pc.product_id = p_product
                    WHERE spc.profile_id = v_profile);

  IF v_total = 0 THEN
    SET v_concern = 30;
  ELSE
    SET v_concern = 60 * v_matched / (v_total * 3);
  END IF;

  IF EXISTS (SELECT 1 FROM product_skin_type
              WHERE product_id = p_product AND skin_type = v_type) THEN
    SET v_type_pts = 30;
  END IF;

  IF v_target = 'unisex' OR v_gender IS NULL OR v_gender = 'other' OR v_target = v_gender THEN
    SET v_gen_pts = 10;
  END IF;

  RETURN ROUND(LEAST(v_concern + v_type_pts + v_gen_pts, 100), 2);
END //

-- B2. fn_avg_rating(product) -> average rating, 0 when there is no review
CREATE FUNCTION fn_avg_rating(p_product INT)
RETURNS DECIMAL(3,2)
READS SQL DATA
BEGIN
  DECLARE v_avg DECIMAL(3,2);
  SET v_avg = (SELECT AVG(rating) FROM review WHERE product_id = p_product);
  RETURN COALESCE(v_avg, 0);
END //


-- =====================================================================
-- PART C. STORED PROCEDURES  (run with CALL)
-- =====================================================================

-- C1. sp_generate_recommendations(user, how many, OUT how many were saved)
--     Scores every product with fn_match_score, keeps the best p_limit with score > 0,
--     logs them into RECOMMENDATION and returns them as a result set.
--     The INSERT ... SELECT is one statement, so the log is written all-or-nothing.
CREATE PROCEDURE sp_generate_recommendations(IN p_user INT, IN p_limit INT, OUT p_count INT)
BEGIN
  DECLARE v_now DATETIME DEFAULT NOW();

  IF NOT EXISTS (SELECT 1 FROM skin_profile WHERE user_id = p_user) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Please create your skin profile before asking for recommendations';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 20 THEN
    SET p_limit = 5;
  END IF;

  INSERT INTO recommendation (user_id, product_id, match_score, recommended_date)
  SELECT p_user, s.product_id, s.score, v_now
    FROM (SELECT product_id, fn_match_score(p_user, product_id) AS score
            FROM product) AS s
   WHERE s.score > 0
   ORDER BY s.score DESC, s.product_id
   LIMIT p_limit;

  SET p_count = ROW_COUNT();

  SELECT r.recommendation_id, r.match_score, r.recommended_date,
         c.product_id, c.product_name, c.brand_name, c.category, c.price,
         c.avg_rating, c.review_count, c.allergen_count
    FROM recommendation r
    JOIN v_product_catalog c ON c.product_id = r.product_id
   WHERE r.user_id = p_user AND r.recommended_date = v_now
   ORDER BY r.match_score DESC, c.avg_rating DESC;
END //

-- C2. sp_product_summary(product, OUT avg rating, OUT number of reviews)
--     Example of IN and OUT parameters (Lab 11).
CREATE PROCEDURE sp_product_summary(IN p_product INT, OUT p_avg DECIMAL(3,2), OUT p_reviews INT)
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO p_avg, p_reviews
    FROM review
   WHERE product_id = p_product;
END //


-- =====================================================================
-- PART D. TRIGGERS  (run by themselves when a row changes)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_product_price_audit //
DROP TRIGGER IF EXISTS trg_moisturizer_category //
DROP TRIGGER IF EXISTS trg_serum_category //
DROP TRIGGER IF EXISTS trg_sunscreen_category //
DROP TRIGGER IF EXISTS trg_product_category_change //

-- D1. Audit every price change. The web app puts the admin's email in @app_user
--     on the same connection before the UPDATE; from Workbench it falls back to
--     the MySQL account (CURRENT_USER()).
CREATE TRIGGER trg_product_price_audit
AFTER UPDATE ON product
FOR EACH ROW
BEGIN
  IF OLD.price <> NEW.price THEN
    INSERT INTO product_price_log (product_id, old_price, new_price, changed_by)
    VALUES (NEW.product_id, OLD.price, NEW.price, COALESCE(@app_user, CURRENT_USER()));
  END IF;
END //

-- D2-D4. Keep the EER specialization consistent: a subtype row is allowed only
--        when the superclass row has the matching category.
CREATE TRIGGER trg_moisturizer_category
BEFORE INSERT ON moisturizer
FOR EACH ROW
BEGIN
  IF (SELECT category FROM product WHERE product_id = NEW.product_id) <> 'moisturizer' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This product is not in the moisturizer category';
  END IF;
END //

CREATE TRIGGER trg_serum_category
BEFORE INSERT ON serum
FOR EACH ROW
BEGIN
  IF (SELECT category FROM product WHERE product_id = NEW.product_id) <> 'serum' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This product is not in the serum category';
  END IF;
END //

CREATE TRIGGER trg_sunscreen_category
BEFORE INSERT ON sunscreen
FOR EACH ROW
BEGIN
  IF (SELECT category FROM product WHERE product_id = NEW.product_id) <> 'sunscreen' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This product is not in the sunscreen category';
  END IF;
END //

-- D5. The other direction: block changing a product's category while it still has
--     a subtype row of the old category (keeps the specialization disjoint).
CREATE TRIGGER trg_product_category_change
BEFORE UPDATE ON product
FOR EACH ROW
BEGIN
  IF OLD.category <> NEW.category AND (
       EXISTS (SELECT 1 FROM moisturizer WHERE product_id = OLD.product_id) OR
       EXISTS (SELECT 1 FROM serum       WHERE product_id = OLD.product_id) OR
       EXISTS (SELECT 1 FROM sunscreen   WHERE product_id = OLD.product_id)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Remove the subtype details before changing the category';
  END IF;
END //

DELIMITER ;

SHOW FULL TABLES WHERE Table_type = 'VIEW';
SHOW TRIGGERS;
