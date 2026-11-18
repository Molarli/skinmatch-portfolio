-- =====================================================================
-- SkinMatch, Project 2
-- 05_demo_queries.sql : every SQL feature the project asks for, one block each.
-- Run in MySQL Workbench as admin/root, ONE STATEMENT AT A TIME
-- (put the cursor in a statement and press Ctrl/Cmd + Enter).
-- Statements marked [EXPECTED ERROR] are commented out on purpose: select the
-- statement text after "-- " and press Ctrl/Cmd + Shift + Enter to run the selection.
--
--   Section 1  DDL and schema modification
--   Section 2  DML: insert, update, delete
--   Section 3  Basic retrieval
--   Section 4  Joins
--   Section 5  Aggregate queries
--   Section 6  Nested queries (subqueries)
--   Section 7  Set operations, CTE, window functions
--   Section 8  Views
--   Section 9  Stored functions and procedures
--   Section 10 Triggers
--   Section 11 Transactions
--   Section 12 Access control / security
--   Section 13 Indexes and EXPLAIN
-- =====================================================================

USE skinmatch;

-- =====================================================================
-- Section 1. DDL and schema modification
-- =====================================================================

-- 1.1 Look at a table's structure and constraints
DESCRIBE product;
SHOW CREATE TABLE review;

-- 1.2 ALTER TABLE: add a column with a default and a CHECK constraint
ALTER TABLE product
  ADD COLUMN launch_year SMALLINT NULL,
  ADD CONSTRAINT chk_product_launch CHECK (launch_year IS NULL OR launch_year >= 2000);

UPDATE product SET launch_year = 2025 WHERE brand_id IN (1, 2);
SELECT product_id, product_name, launch_year FROM product WHERE launch_year IS NOT NULL;

-- 1.3 ALTER TABLE: change a column, then undo everything (schema back to the design)
ALTER TABLE product MODIFY COLUMN launch_year YEAR NULL;
ALTER TABLE product DROP CHECK chk_product_launch;
ALTER TABLE product DROP COLUMN launch_year;

-- 1.4 Constraints at work  [EXPECTED ERROR]  each line is refused by MySQL
-- INSERT INTO review (user_id, product_id, rating) VALUES (2, 5, 9);           -- CHECK: rating 1-5
-- INSERT INTO review (user_id, product_id, rating) VALUES (2, 1, 5);           -- UNIQUE: already reviewed
-- INSERT INTO review (user_id, product_id, rating) VALUES (2, 999, 5);         -- FOREIGN KEY: no product 999
-- INSERT INTO skin_profile (user_id, skin_type, age_group) VALUES (2, 'oily', '18-24'); -- UNIQUE: 1:1 HAS
-- DELETE FROM brand WHERE brand_id = 1;                                        -- FK RESTRICT: brand has products
-- INSERT INTO users (full_name, email, password_hash) VALUES ('X', 'member3@example.com', 'x'); -- UNIQUE email


-- =====================================================================
-- Section 2. DML: insert, update, delete
-- =====================================================================

-- 2.1 INSERT a new brand and a product with its bridge rows
INSERT INTO brand (brand_name, country_of_origin, website)
VALUES ('AQUALEAF', 'Thailand', 'https://aqualeaf.example.com');

INSERT INTO product (product_name, brand_id, category, price, volume_ml, gender_target)
VALUES ('Mineral Water Hydrating Toner', LAST_INSERT_ID(), 'toner', 260.00, 150, 'unisex');
SET @new_product = LAST_INSERT_ID();

INSERT INTO product_skin_type (product_id, skin_type) VALUES (@new_product, 'dry'), (@new_product, 'normal');
INSERT INTO product_concern (product_id, concern_id, effectiveness_level) VALUES (@new_product, 5, 2);
INSERT INTO product_ingredient (product_id, ingredient_id, concentration_percent)
VALUES (@new_product, 2, 1.0), (@new_product, 12, NULL);

SELECT * FROM v_product_catalog WHERE product_id = @new_product;

-- 2.2 UPDATE with a computed value: 10% off every mask
UPDATE product SET price = ROUND(price * 0.9, 2) WHERE category = 'mask';
SELECT product_id, product_name, price FROM product WHERE category = 'mask';
-- (the price trigger logged both changes; put the prices back)
UPDATE product SET price = 380.00 WHERE product_id = 4;
UPDATE product SET price = 290.00 WHERE product_id = 17;

-- 2.3 DELETE: ON DELETE CASCADE removes the product's bridge rows automatically
DELETE FROM product WHERE product_id = @new_product;
SELECT COUNT(*) AS bridge_rows_left FROM product_ingredient WHERE product_id = @new_product;  -- 0
DELETE FROM brand WHERE brand_name = 'AQUALEAF';


-- =====================================================================
-- Section 3. Basic retrieval
-- =====================================================================

-- 3.1 WHERE, BETWEEN, ORDER BY, LIMIT: the 5 cheapest serums or moisturizers under 600 baht
SELECT product_id, product_name, category, price
FROM   product
WHERE  category IN ('serum', 'moisturizer') AND price BETWEEN 300 AND 600
ORDER  BY price ASC
LIMIT  5;

-- 3.2 LIKE: products whose name mentions SPF
SELECT product_id, product_name FROM product WHERE product_name LIKE '%SPF%';

-- 3.3 DISTINCT: which countries do our brands come from?
SELECT DISTINCT country_of_origin FROM brand ORDER BY country_of_origin;

-- 3.4 IS NULL: users who have not entered a phone number
SELECT user_id, full_name FROM users WHERE phone IS NULL;


-- =====================================================================
-- Section 4. Joins
-- =====================================================================

-- 4.1 INNER JOIN across four tables: full ingredient list of product 1
SELECT p.product_name, b.brand_name, i.ingredient_name, i.name_th,
       pi.concentration_percent, i.is_allergen
FROM   product p
JOIN   brand b               ON b.brand_id = p.brand_id
JOIN   product_ingredient pi ON pi.product_id = p.product_id
JOIN   ingredient i          ON i.ingredient_id = pi.ingredient_id
WHERE  p.product_id = 1;

-- 4.2 LEFT JOIN: every product, even those with no review yet (review_count = 0)
SELECT p.product_id, p.product_name, COUNT(r.review_id) AS review_count
FROM   product p
LEFT JOIN review r ON r.product_id = p.product_id
GROUP  BY p.product_id, p.product_name
HAVING review_count = 0;

-- 4.3 Join through two bridge tables: which concerns of user 2 does each product treat?
SELECT p.product_name, sc.name_th AS concern, spc.severity_level, pc.effectiveness_level
FROM   skin_profile sp
JOIN   skin_profile_concern spc ON spc.profile_id = sp.profile_id
JOIN   product_concern pc       ON pc.concern_id  = spc.concern_id
JOIN   product p                ON p.product_id   = pc.product_id
JOIN   skin_concern sc          ON sc.concern_id  = spc.concern_id
WHERE  sp.user_id = 2
ORDER  BY p.product_name, spc.severity_level DESC;

-- 4.4 Self join: pairs of products from the same brand in different categories
SELECT b.brand_name, p1.product_name AS product_a, p2.product_name AS product_b
FROM   product p1
JOIN   product p2 ON p2.brand_id = p1.brand_id AND p1.product_id < p2.product_id
                 AND p1.category <> p2.category
JOIN   brand b    ON b.brand_id = p1.brand_id;

-- 4.5 EER: superclass joined with its subclasses (LEFT JOIN to every subtype table)
SELECT p.product_id, p.product_name, p.category,
       m.texture, m.finish, s.key_active, s.active_percent, u.spf, u.pa_rating, u.filter_type
FROM   product p
LEFT JOIN moisturizer m ON m.product_id = p.product_id
LEFT JOIN serum s       ON s.product_id = p.product_id
LEFT JOIN sunscreen u   ON u.product_id = p.product_id
ORDER  BY p.category, p.product_id;


-- =====================================================================
-- Section 5. Aggregate queries
-- =====================================================================

-- 5.1 GROUP BY: number of products and price statistics per category
SELECT category, COUNT(*) AS products, MIN(price) AS cheapest,
       MAX(price) AS most_expensive, ROUND(AVG(price), 2) AS avg_price
FROM   product
GROUP  BY category
ORDER  BY avg_price DESC;

-- 5.2 HAVING: brands whose products average at least 4 stars over 3+ reviews
SELECT b.brand_name, ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(*) AS reviews
FROM   brand b
JOIN   product p ON p.brand_id = b.brand_id
JOIN   review  r ON r.product_id = p.product_id
GROUP  BY b.brand_id, b.brand_name
HAVING AVG(r.rating) >= 4 AND COUNT(*) >= 3
ORDER  BY avg_rating DESC;

-- 5.3 Most common skin concern among members
SELECT sc.name_th, COUNT(*) AS members, ROUND(AVG(spc.severity_level), 2) AS avg_severity
FROM   skin_profile_concern spc
JOIN   skin_concern sc ON sc.concern_id = spc.concern_id
GROUP  BY sc.concern_id, sc.name_th
ORDER  BY members DESC;

-- 5.4 GROUP_CONCAT: one line per product listing its target skin types
SELECT p.product_name, GROUP_CONCAT(pst.skin_type ORDER BY pst.skin_type SEPARATOR ', ') AS suits
FROM   product p
JOIN   product_skin_type pst ON pst.product_id = p.product_id
GROUP  BY p.product_id, p.product_name;


-- =====================================================================
-- Section 6. Nested queries (subqueries)
-- =====================================================================

-- 6.1 NOT EXISTS: products that contain NONE of user 4's allergens (allergen-exclusion filter)
SELECT p.product_id, p.product_name
FROM   product p
WHERE  NOT EXISTS (SELECT 1
                     FROM product_ingredient pi
                     JOIN skin_profile_allergen spa ON spa.ingredient_id = pi.ingredient_id
                     JOIN skin_profile sp           ON sp.profile_id = spa.profile_id
                    WHERE pi.product_id = p.product_id
                      AND sp.user_id = 4);

-- 6.2 IN subquery: products made by Thai brands
SELECT product_name, price
FROM   product
WHERE  brand_id IN (SELECT brand_id FROM brand WHERE country_of_origin = 'Thailand');

-- 6.3 Correlated subquery: products priced above the average of their own category
SELECT p.product_name, p.category, p.price
FROM   product p
WHERE  p.price > (SELECT AVG(p2.price) FROM product p2 WHERE p2.category = p.category)
ORDER  BY p.category;

-- 6.4 Scalar subquery in SELECT: each product's rating next to the catalogue average
SELECT p.product_name,
       (SELECT ROUND(AVG(rating), 2) FROM review r WHERE r.product_id = p.product_id) AS product_avg,
       (SELECT ROUND(AVG(rating), 2) FROM review) AS overall_avg
FROM   product p;

-- 6.5 > ALL: the product(s) more expensive than every sunscreen
SELECT product_name, price
FROM   product
WHERE  price > ALL (SELECT price FROM product WHERE category = 'sunscreen');

-- 6.6 Derived table in FROM: the top-rated product of each category
SELECT t.category, t.product_name, t.avg_rating
FROM  (SELECT p.category, p.product_name, AVG(r.rating) AS avg_rating
         FROM product p JOIN review r ON r.product_id = p.product_id
        GROUP BY p.product_id, p.category, p.product_name) AS t
WHERE  t.avg_rating = (SELECT MAX(t2.avg_rating)
                         FROM (SELECT p.category, AVG(r.rating) AS avg_rating
                                 FROM product p JOIN review r ON r.product_id = p.product_id
                                GROUP BY p.product_id, p.category) AS t2
                        WHERE t2.category = t.category);

-- 6.7 Relational division (double NOT EXISTS): products that treat EVERY concern of user 3
SELECT p.product_id, p.product_name
FROM   product p
WHERE  NOT EXISTS (
         SELECT spc.concern_id
           FROM skin_profile_concern spc
           JOIN skin_profile sp ON sp.profile_id = spc.profile_id
          WHERE sp.user_id = 3
            AND NOT EXISTS (SELECT 1 FROM product_concern pc
                             WHERE pc.product_id = p.product_id
                               AND pc.concern_id = spc.concern_id));

-- 6.8 Members who have reviewed more products than the average member
SELECT u.full_name, COUNT(*) AS reviews
FROM   users u JOIN review r ON r.user_id = u.user_id
GROUP  BY u.user_id, u.full_name
HAVING COUNT(*) > (SELECT COUNT(*) / COUNT(DISTINCT user_id) FROM review);


-- =====================================================================
-- Section 7. Set operations, CTE, window functions
-- =====================================================================

-- 7.1 UNION: products that suit oily skin OR treat acne (duplicates removed)
SELECT product_id FROM product_skin_type WHERE skin_type = 'oily'
UNION
SELECT product_id FROM product_concern   WHERE concern_id = 1
ORDER BY product_id;

-- 7.2 Intersection written with IN (works on every MySQL 8; INTERSECT needs 8.0.31+)
SELECT DISTINCT product_id FROM product_skin_type
WHERE  skin_type = 'oily'
  AND  product_id IN (SELECT product_id FROM product_concern WHERE concern_id = 1);

-- 7.3 Common table expression (WITH): average rating per brand, then keep the best
WITH brand_rating AS (
  SELECT p.brand_id, AVG(r.rating) AS avg_rating
  FROM   product p JOIN review r ON r.product_id = p.product_id
  GROUP  BY p.brand_id
)
SELECT b.brand_name, ROUND(br.avg_rating, 2) AS avg_rating
FROM   brand_rating br JOIN brand b ON b.brand_id = br.brand_id
WHERE  br.avg_rating = (SELECT MAX(avg_rating) FROM brand_rating);

-- 7.4 Window function: rank products by rating inside each category
SELECT category, product_name, avg_rating,
       RANK() OVER (PARTITION BY category ORDER BY avg_rating DESC) AS rank_in_category
FROM   v_product_catalog
WHERE  avg_rating IS NOT NULL;

-- 7.5 CASE: label each product by price band
SELECT product_name, price,
       CASE WHEN price < 400 THEN 'budget'
            WHEN price < 700 THEN 'mid-range'
            ELSE 'premium' END AS price_band
FROM   product ORDER BY price;


-- =====================================================================
-- Section 8. Views
-- =====================================================================

-- 8.1 The catalogue view behaves like a table
SELECT product_name, brand_name, price, avg_rating, review_count, allergen_count
FROM   v_product_catalog
WHERE  allergen_count = 0
ORDER  BY avg_rating DESC;

-- 8.2 Brand report used by the admin page and the report account
SELECT * FROM v_brand_report ORDER BY avg_rating DESC;

-- 8.3 Public reviews: no email and no user_id are exposed
SELECT * FROM v_public_reviews WHERE product_id = 1;

-- 8.4 Member summary (GROUP_CONCAT of concerns)
SELECT * FROM v_user_profile_summary;


-- =====================================================================
-- Section 9. Stored functions and procedures
-- =====================================================================

-- 9.1 A function inside SELECT and ORDER BY: user 2's top 5 matches, computed live
SELECT product_id, product_name, fn_match_score(2, product_id) AS match_score,
       fn_avg_rating(product_id) AS avg_rating
FROM   product
ORDER  BY match_score DESC
LIMIT  5;

-- 9.2 The allergen rule inside the function: product 3 contains fragrance,
--     user 2 is allergic to fragrance, so the score is 0
SELECT fn_match_score(2, 3) AS score_with_allergen;

-- 9.3 Procedure with a result set and an OUT parameter
CALL sp_generate_recommendations(2, 5, @saved);
SELECT @saved AS rows_saved_in_log;

-- 9.4 Procedure with IN and OUT parameters
CALL sp_product_summary(1, @avg, @n);
SELECT @avg AS avg_rating, @n AS reviews;

-- 9.5 The procedure refuses a user with no profile  [EXPECTED ERROR 1644]
-- CALL sp_generate_recommendations(9, 5, @saved);

-- 9.6 Which routines exist
SHOW FUNCTION STATUS  WHERE Db = 'skinmatch';
SHOW PROCEDURE STATUS WHERE Db = 'skinmatch';


-- =====================================================================
-- Section 10. Triggers
-- =====================================================================

-- 10.1 Price audit trigger: change a price, then read the log the trigger wrote
SET @app_user = 'demo in Workbench';
UPDATE product SET price = 499.00 WHERE product_id = 13;
SET @app_user = NULL;
SELECT l.log_id, p.product_name, l.old_price, l.new_price, l.changed_by, l.changed_at
FROM   product_price_log l JOIN product p ON p.product_id = l.product_id
ORDER  BY l.log_id DESC;

-- 10.2 Updating something other than price writes no log row
UPDATE product SET volume_ml = 30 WHERE product_id = 13;
SELECT COUNT(*) AS log_rows FROM product_price_log WHERE product_id = 13;

-- 10.3 Specialization guard  [EXPECTED ERROR 1644] product 4 is a mask, not a sunscreen
-- INSERT INTO sunscreen (product_id, spf, pa_rating, filter_type) VALUES (4, 30, 'PA++', 'physical');

-- 10.4 Category change guard  [EXPECTED ERROR 1644] product 3 still has a sunscreen row
-- UPDATE product SET category = 'moisturizer' WHERE product_id = 3;

-- put product 13 back
UPDATE product SET price = 490.00 WHERE product_id = 13;


-- =====================================================================
-- Section 11. Transactions
-- =====================================================================

-- 11.1 ROLLBACK: save a new skin profile in several steps, then cancel it all
START TRANSACTION;
  INSERT INTO skin_profile (user_id, skin_type, age_group) VALUES (9, 'combination', '25-34');
  SET @pid = LAST_INSERT_ID();
  INSERT INTO skin_profile_concern (profile_id, concern_id, severity_level) VALUES (@pid, 1, 2), (@pid, 4, 3);
  SELECT * FROM skin_profile_concern WHERE profile_id = @pid;   -- visible inside the transaction
ROLLBACK;
SELECT COUNT(*) AS profiles_for_user_9 FROM skin_profile WHERE user_id = 9;   -- 0: nothing was kept

-- 11.2 COMMIT: the same steps, kept for good
START TRANSACTION;
  INSERT INTO skin_profile (user_id, skin_type, age_group) VALUES (9, 'combination', '25-34');
  SET @pid = LAST_INSERT_ID();
  INSERT INTO skin_profile_concern (profile_id, concern_id, severity_level) VALUES (@pid, 1, 2), (@pid, 4, 3);
COMMIT;
SELECT * FROM v_user_profile_summary WHERE user_id = 9;

-- 11.3 SAVEPOINT: keep the first change, undo only the second
START TRANSACTION;
  UPDATE product SET price = price + 10 WHERE product_id = 6;
  SAVEPOINT after_first;
  UPDATE product SET price = price + 1000 WHERE product_id = 7;   -- a mistake
  ROLLBACK TO SAVEPOINT after_first;
COMMIT;
SELECT product_id, price FROM product WHERE product_id IN (6, 7);

-- 11.4 Isolation demo (needs TWO Workbench tabs = two connections)
--   Tab A: START TRANSACTION; UPDATE product SET price = 1 WHERE product_id = 1;
--   Tab B: SELECT price FROM product WHERE product_id = 1;   -- still the old price (no dirty read)
--   Tab A: ROLLBACK;

-- clean up so the demo can be run again
DELETE FROM skin_profile WHERE user_id = 9;
UPDATE product SET price = price - 10 WHERE product_id = 6;


-- =====================================================================
-- Section 12. Access control / security
-- =====================================================================

-- 12.1 What may each account do?
SHOW GRANTS FOR 'skinmatch_app'@'localhost' USING 'sm_reader', 'sm_writer', 'sm_executor';
SHOW GRANTS FOR 'skinmatch_report'@'localhost';
SHOW GRANTS FOR 'skinmatch_editor'@'localhost';

-- 12.2 REVOKE and GRANT again: the app account temporarily loses INSERT/UPDATE/DELETE
REVOKE 'sm_writer' FROM 'skinmatch_app'@'localhost';
SHOW GRANTS FOR 'skinmatch_app'@'localhost';
GRANT  'sm_writer' TO   'skinmatch_app'@'localhost';

-- 12.3 Lock and unlock an account (for example after a leaked password)
ALTER USER 'skinmatch_report'@'localhost' ACCOUNT LOCK;
ALTER USER 'skinmatch_report'@'localhost' ACCOUNT UNLOCK;

-- 12.4 Test as the report account: open a NEW Workbench connection
--      user skinmatch_report / CHANGE_ME_SKINMATCH_REPORT!, then:
--   SELECT * FROM skinmatch.v_brand_report;          -- works
--   SELECT email FROM skinmatch.users;               -- ERROR 1142: SELECT command denied
--   Test as skinmatch_editor:
--   UPDATE skinmatch.product SET price = 300 WHERE product_id = 6;          -- works (column grant)
--   UPDATE skinmatch.product SET category = 'mask' WHERE product_id = 6;    -- ERROR 1143: column denied

-- 12.5 App passwords are stored as salted scrypt hashes, never as plain text
SELECT user_id, email, LEFT(password_hash, 30) AS hash_start, role FROM users;


-- =====================================================================
-- Section 13. Indexes and EXPLAIN
-- =====================================================================
SHOW INDEX FROM product;

-- 13.1 Uses idx_product_category_price (type = range/ref, key = idx_product_category_price)
--      Note: with only 18 rows the optimizer is allowed to prefer a full scan; the
--      possible_keys column still shows that the index can be used.
EXPLAIN SELECT product_id, product_name, price FROM product
        WHERE category = 'serum' AND price < 800;

-- 13.2 No index on product_name, so MySQL scans the whole table (type = ALL)
EXPLAIN SELECT product_id FROM product WHERE product_name LIKE '%Sunscreen%';

-- 13.3 A foreign key is indexed automatically, so this join uses an index on review
EXPLAIN SELECT p.product_name, r.rating
        FROM product p JOIN review r ON r.product_id = p.product_id
        WHERE p.product_id = 1;
