-- =====================================================================
-- SkinMatch, Project 2
-- 03_data.sql : sample data (run after 01_schema.sql and 02_views_routines.sql)
-- Brands and products are fictional, taken from our Project 1 UI mock-up (English version).
-- Demo logins (passwords are stored only as scrypt hashes):
--   demo-admin@example.com      / admin1234   (role admin)
--   member1@example.com / member1234  (and every other member)
-- =====================================================================

SET NAMES utf8mb4;
USE skinmatch;

-- Skin concerns (standard vocabulary)
INSERT INTO skin_concern (concern_id, concern_name, name_th, description) VALUES
(1,'acne','Acne','Breakouts, clogged pores and inflamed spots'),
(2,'wrinkles','Wrinkles','Fine lines and loss of firmness'),
(3,'dark_spots','Dark spots','Hyperpigmentation and post-acne marks'),
(4,'large_pores','Large pores','Visible, enlarged pores'),
(5,'dullness','Dullness','Uneven, tired-looking skin tone'),
(6,'redness','Redness / irritation','Redness, irritation and sensitivity');

-- Brands
INSERT INTO brand (brand_id, brand_name, country_of_origin, website) VALUES
(1,'DEWCEAN','Thailand','https://dewcean.example.com'),
(2,'CLEARA','South Korea','https://cleara.example.com'),
(3,'GLOWDERM','Japan','https://glowderm.example.com'),
(4,'BOTANIQUE','France','https://botanique.example.com'),
(5,'LUMISOL','Thailand','https://lumisol.example.com'),
(6,'PUREVERA','Thailand','https://purevera.example.com'),
(7,'MILKAIRE','Japan','https://milkaire.example.com'),
(8,'SKINLUXE','South Korea','https://skinluxe.example.com'),
(9,'VELVETIN','Thailand',NULL);

-- Ingredients (the last five are flagged as allergens)
INSERT INTO ingredient (ingredient_id, ingredient_name, name_th, function_benefit, is_allergen) VALUES
(1,'Niacinamide','Niacinamide','Controls oil, refines pores, evens tone',FALSE),
(2,'Hyaluronic Acid','Hyaluronic acid','Draws water into the skin',FALSE),
(3,'Salicylic Acid','Salicylic acid (BHA)','Unclogs pores, treats acne',FALSE),
(4,'Ascorbic Acid','Vitamin C','Brightens, antioxidant',FALSE),
(5,'Retinol','Retinol','Smooths fine lines, speeds cell turnover',FALSE),
(6,'Ceramide NP','Ceramide','Repairs the skin barrier',FALSE),
(7,'Centella Asiatica Extract','Centella extract','Calms redness and irritation',FALSE),
(8,'Green Tea Extract','Green tea extract','Antioxidant, soothes oily skin',FALSE),
(9,'Zinc PCA','Zinc PCA','Regulates sebum',FALSE),
(10,'Panthenol','Panthenol (B5)','Soothes and moisturises',FALSE),
(11,'Aloe Barbadensis Leaf Juice','Aloe vera','Cools and calms',FALSE),
(12,'Glycerin','Glycerin','Humectant moisturiser',FALSE),
(13,'Squalane','Squalane','Light, non-greasy emollient',FALSE),
(14,'Tea Tree Leaf Oil','Tea tree oil','Antibacterial for acne',FALSE),
(15,'Zinc Oxide','Zinc oxide','Physical UV filter',FALSE),
(16,'Titanium Dioxide','Titanium dioxide','Physical UV filter',FALSE),
(17,'Ethylhexyl Methoxycinnamate','Chemical UV filter (octinoxate)','Chemical UVB filter',FALSE),
(18,'Alpha Arbutin','Alpha arbutin','Fades dark spots',FALSE),
(19,'Palmitoyl Tripeptide-1','Peptide','Supports firmness',FALSE),
(20,'Oryza Sativa (Rice) Extract','Rice milk extract','Brightens and softens',FALSE),
(21,'Kaolin','Kaolin clay','Absorbs excess oil',FALSE),
(22,'Allantoin','Allantoin','Soothes irritated skin',FALSE),
(23,'Fragrance (Parfum)','Fragrance','Scent only, a common irritant',TRUE),
(24,'Alcohol Denat.','Alcohol','Quick-dry texture, can dry and irritate',TRUE),
(25,'Lavandula Angustifolia Oil','Essential oil','Essential oil scent, possible sensitiser',TRUE),
(26,'Methylparaben','Paraben','Preservative, possible sensitiser',TRUE),
(27,'CI 19140','Synthetic colourant','Synthetic colour, possible sensitiser',TRUE);

-- Products (superclass rows)
INSERT INTO product (product_id, product_name, brand_id, category, price, volume_ml, gender_target) VALUES
(1,'Oil-Free Moisturizing Essence',1,'moisturizer',550.00,50,'unisex'),
(2,'Niacinamide 10% Dark Spot Serum',2,'serum',620.00,30,'unisex'),
(3,'Lightweight Sunscreen SPF50 PA++++',3,'sunscreen',450.00,40,'unisex'),
(4,'Volcanic Clay Oil-Control Mask',4,'mask',380.00,100,'unisex'),
(5,'Vitamin C 15% Brightening Serum',5,'serum',750.00,30,'unisex'),
(6,'Soothing Aloe Vera Gel 98%',6,'moisturizer',320.00,200,'unisex'),
(7,'Lightweight Rice Milk Lotion',7,'moisturizer',350.00,150,'unisex'),
(8,'Intensive Anti-Wrinkle Night Cream',8,'moisturizer',890.00,50,'female'),
(9,'Combination Skin Balancing Moisturizer',9,'moisturizer',480.00,50,'unisex'),
(10,'Salicylic Acid 2% Acne Cleansing Gel',2,'cleanser',290.00,150,'unisex'),
(11,'Centella Redness-Relief Toner',6,'toner',420.00,200,'unisex'),
(12,'Mineral Sunscreen SPF50 PA+++ for Sensitive Skin',3,'sunscreen',520.00,50,'unisex'),
(13,'Hyaluronic Hydrating Serum',1,'serum',490.00,30,'unisex'),
(14,'Retinol 0.5% Anti-Wrinkle Serum',8,'serum',990.00,30,'unisex'),
(15,'Green Tea Cleansing Gel',4,'cleanser',350.00,150,'unisex'),
(16,'Men''s Oil-Control Sunscreen SPF50',5,'sunscreen',390.00,40,'male'),
(17,'Alpha Arbutin Sheet Mask',7,'mask',290.00,25,'unisex'),
(18,'Ceramide Repair Cream for Dry Skin',9,'moisturizer',560.00,50,'unisex');

-- EER subtypes (the category triggers check each row)
INSERT INTO moisturizer (product_id, texture, finish) VALUES
(1,'gel','matte'),
(6,'gel','natural'),
(7,'lotion','natural'),
(8,'cream','dewy'),
(9,'lotion','natural'),
(18,'cream','dewy');
INSERT INTO serum (product_id, key_active, active_percent) VALUES
(2,'Niacinamide',10),
(5,'Ascorbic Acid',15),
(13,'Hyaluronic Acid',2),
(14,'Retinol',0.5);
INSERT INTO sunscreen (product_id, spf, pa_rating, filter_type) VALUES
(3,50,'PA++++','chemical'),
(12,50,'PA+++','physical'),
(16,50,'PA+++','hybrid');

-- Which skin types each product suits
INSERT INTO product_skin_type (product_id, skin_type) VALUES
(1,'oily'),
(1,'combination'),
(2,'oily'),
(2,'combination'),
(2,'normal'),
(2,'sensitive'),
(3,'oily'),
(3,'combination'),
(3,'dry'),
(3,'normal'),
(3,'sensitive'),
(4,'oily'),
(4,'combination'),
(5,'normal'),
(5,'combination'),
(5,'oily'),
(6,'sensitive'),
(6,'dry'),
(6,'normal'),
(7,'sensitive'),
(7,'normal'),
(7,'dry'),
(8,'dry'),
(8,'normal'),
(9,'combination'),
(9,'normal'),
(10,'oily'),
(10,'combination'),
(11,'sensitive'),
(11,'normal'),
(11,'dry'),
(11,'combination'),
(12,'sensitive'),
(12,'dry'),
(12,'normal'),
(13,'dry'),
(13,'normal'),
(13,'sensitive'),
(13,'combination'),
(14,'normal'),
(14,'dry'),
(14,'combination'),
(15,'oily'),
(15,'combination'),
(15,'normal'),
(16,'oily'),
(16,'combination'),
(17,'oily'),
(17,'combination'),
(17,'dry'),
(17,'normal'),
(17,'sensitive'),
(18,'dry'),
(18,'sensitive');

-- Which concerns each product targets (effectiveness 1-3)
INSERT INTO product_concern (product_id, concern_id, effectiveness_level) VALUES
(1,1,3),
(1,4,2),
(2,3,3),
(2,4,2),
(3,5,2),
(3,3,2),
(4,1,2),
(4,4,3),
(5,5,3),
(5,3,3),
(6,6,3),
(7,6,2),
(7,5,2),
(8,2,3),
(8,5,1),
(9,4,2),
(9,5,1),
(10,1,3),
(10,4,2),
(11,6,3),
(11,1,1),
(12,6,2),
(13,5,2),
(13,2,1),
(14,2,3),
(14,3,1),
(15,1,2),
(15,5,1),
(16,4,1),
(16,1,1),
(17,3,2),
(17,5,3),
(18,6,2),
(18,2,1);

-- Product composition (concentration NULL = not disclosed)
INSERT INTO product_ingredient (product_id, ingredient_id, concentration_percent) VALUES
(1,1,5),
(1,8,NULL),
(1,9,1),
(1,12,NULL),
(2,1,10),
(2,9,1),
(2,12,NULL),
(3,17,7.5),
(3,2,NULL),
(3,12,NULL),
(3,23,NULL),
(4,21,NULL),
(4,14,1),
(4,25,NULL),
(5,4,15),
(5,2,NULL),
(5,24,NULL),
(6,11,98),
(6,10,NULL),
(6,22,NULL),
(7,20,NULL),
(7,6,NULL),
(7,12,NULL),
(8,5,0.3),
(8,19,NULL),
(8,13,NULL),
(8,23,NULL),
(9,2,NULL),
(9,1,2),
(9,12,NULL),
(10,3,2),
(10,14,NULL),
(10,26,NULL),
(11,7,NULL),
(11,10,NULL),
(11,22,NULL),
(12,15,15),
(12,16,5),
(12,13,NULL),
(13,2,2),
(13,10,NULL),
(13,12,NULL),
(14,5,0.5),
(14,13,NULL),
(15,8,NULL),
(15,12,NULL),
(15,23,NULL),
(16,17,7.5),
(16,9,NULL),
(16,24,NULL),
(17,18,2),
(17,20,NULL),
(17,27,NULL),
(18,6,NULL),
(18,13,NULL),
(18,10,NULL);

-- Users (user 9 has no skin profile yet: partial participation of USER in HAS)
INSERT INTO users (user_id, full_name, email, password_hash, gender, birth_date, phone, role) VALUES
(1,'Admin SkinMatch','demo-admin@example.com','scrypt$773d666ae89521678c83c7b754c928d9$82212147cfceacd86db6f654c3b5f41d37e943a4fa05ad04ce6e4b34dedca3dbc5ee345fdd94b1be8342085906b049bdd9c8f7cb8e2418f36527b58abdff50f8',NULL,NULL,NULL,'admin'),
(2,'Member 1','member1@example.com','scrypt$550902dfd2bf75fd0476b7b7320123d0$d97caab850ed9b0591b7fd55a59956a84b134e8e2da3a4c8387ccabb173696906db103464e1927fec3e22e33791def847afbd65666449a482369ef8ecbb96f28','female',NULL,NULL,'member'),
(3,'Member 2','member2@example.com','scrypt$027e829da9b693401c51796277d2711a$d528bcb1d22601a751505b449ca4ad31bfb7e89cdb5933bab3a3def668258f250399adf3c905b19684387797cdfc65452d205cf0752d359058d54031eaa17f22','male',NULL,NULL,'member'),
(4,'Member 3','member3@example.com','scrypt$9135e2fed719faeef4381cfc279b9669$01d6beb47929b647e5eb6666dd13cdf75212cd9577ec2ce9681c00ea25411f8f987e47805ee2406fb4e2456b3dc586eade9cf945b4d0c6cc5c32c818ad1ccb60','female',NULL,NULL,'member'),
(5,'Member 4','member4@example.com','scrypt$099061380902493d556b6ae157d803c7$5feb8c73092b202a3aadf86dcc7f7c45019807df52145228815d046a6435662afc2fdd4c8397539cff0e1605d404377353ef37566400403d6b01ff7672050a87','male',NULL,NULL,'member'),
(6,'Member 5','member5@example.com','scrypt$d39ccf88a803688c78537ec79395f252$e68e483678822e35500d184f5fa21e60c6ffae70f4cc27da963c2b3e5201c6f309b0fdb61f1c57d0130ec76bbf72ea930e89ce3a69d2da4b5010523a2c94a5dc','other',NULL,NULL,'member'),
(7,'Member 6','member6@example.com','scrypt$0be9570aff25b3eacca617538b65c15b$a88be0429226948dda1a9e665dc6e39fd04165ca19288f8cf8d41aabbd0c263b3b7f544c32b3393be17d6f386cbd510cf0bad2552b047785da537d46347daaea','female',NULL,NULL,'member'),
(8,'Member 7','member7@example.com','scrypt$b9d94b72fa610b69c82bfbb3b8c1e831$3d78df8f4aa8227b6777d35c817bc7937320b09dd92bb89486ecc15361336a6aa13e1c48f19f10db01262654ee8ebf1add517df65a9914fce645045a3b67b632','male',NULL,NULL,'member'),
(9,'New User','new-member@example.com','scrypt$8b27b55703829c24b2fd8d3c503bff8d$a52c675234a183af355f0a62b293c1383edad34975f9b8cbe6ff35e26f3cfa205e5134e8a4029f42d454e273b9246f23d93bac40a16e69e0668a4409ac4dfb00',NULL,NULL,NULL,'member');

-- Skin profiles
INSERT INTO skin_profile (profile_id, user_id, skin_type, skin_tone, age_group) VALUES
(1,2,'oily','light','18-24'),
(2,3,'combination','medium','25-34'),
(3,4,'sensitive','fair','18-24'),
(4,5,'dry','tan','35-44'),
(5,6,'normal','medium','25-34'),
(6,7,'dry','light','45plus'),
(7,8,'oily','medium','18-24');

-- Concerns per profile (severity 1-3)
INSERT INTO skin_profile_concern (profile_id, concern_id, severity_level) VALUES
(1,1,3),
(1,3,2),
(1,6,1),
(2,4,3),
(2,1,2),
(3,6,3),
(3,5,2),
(4,2,3),
(4,3,2),
(5,5,2),
(6,2,3),
(6,5,2),
(6,6,1),
(7,1,3),
(7,4,2);

-- Ingredients each profile must avoid
INSERT INTO skin_profile_allergen (profile_id, ingredient_id) VALUES
(1,23),
(3,23),
(3,24),
(3,25),
(4,26),
(6,24);

-- Reviews
INSERT INTO review (user_id, product_id, rating, comment, review_date) VALUES
(2,1,4,'Less oily on my T-zone, absorbs fast, not sticky','2026-10-28 10:15:00'),
(3,1,4,'Pores look tighter after 2 weeks of daily use','2026-10-12 20:30:00'),
(8,1,5,'Controls oil all day, love it','2026-09-30 08:00:00'),
(2,2,5,'Post-acne dark spots have faded noticeably','2026-10-01 21:00:00'),
(3,2,4,'Lightweight and doesn''t clog pores','2026-10-05 22:10:00'),
(6,2,4,'Works great paired with sunscreen','2026-10-20 09:45:00'),
(2,3,3,'Good protection, but a slight fragrance smell','2026-09-21 12:00:00'),
(5,3,4,'No white cast, not greasy','2026-10-02 13:30:00'),
(7,3,4,'Fine for everyday use','2026-10-11 07:20:00'),
(3,4,4,'Skin feels clean and matte after, fewer clogged pores','2026-09-28 19:00:00'),
(8,4,3,'The essential oil scent is a bit strong','2026-10-15 18:40:00'),
(6,5,5,'My skin really is brighter','2026-10-09 08:30:00'),
(7,5,3,'Stings a little on first use','2026-10-18 21:15:00'),
(4,6,5,'Works on my sensitive skin, no stinging at all','2026-10-03 22:00:00'),
(7,6,4,'Cool and soothing, great after sun exposure','2026-10-25 17:00:00'),
(4,7,5,'Very gentle, redness has calmed down','2026-10-07 20:20:00'),
(6,7,4,'Light rice scent, absorbs quickly','2026-10-19 10:00:00'),
(5,8,4,'Skin feels softer in the morning','2026-10-04 07:00:00'),
(7,8,5,'Fine lines look shallower after a month','2026-10-30 22:30:00'),
(3,9,4,'Balances my combination skin well','2026-10-22 21:00:00'),
(8,10,5,'Pimples go down really fast','2026-10-06 08:10:00'),
(2,10,4,'Cleans well, but a little drying','2026-10-16 09:00:00'),
(4,11,5,'Helps calm redness','2026-10-08 21:40:00'),
(4,12,4,'No irritation, but leaves a slight white cast','2026-10-13 07:30:00'),
(5,14,5,'Saw results within 3 weeks','2026-10-17 22:00:00'),
(7,14,4,'Start slowly, some peeling at first','2026-10-27 21:00:00'),
(3,16,4,'Good oil control for men','2026-10-21 07:45:00'),
(4,18,5,'Dry flaky patches gone within a week','2026-10-29 20:00:00'),
(7,18,5,'Moisturized all night','2026-11-01 22:15:00');

-- Recommendation log: let the stored procedure fill it for every member with a profile
CALL sp_generate_recommendations(2, 5, @n);
CALL sp_generate_recommendations(3, 5, @n);
CALL sp_generate_recommendations(4, 5, @n);
CALL sp_generate_recommendations(5, 5, @n);
CALL sp_generate_recommendations(6, 5, @n);
CALL sp_generate_recommendations(7, 5, @n);
CALL sp_generate_recommendations(8, 5, @n);

-- A first price change so the audit log is not empty (the trigger writes the log row)
SET @app_user = 'demo-admin@example.com (seed)';
UPDATE product SET price = 590.00 WHERE product_id = 2;
SET @app_user = NULL;

-- Row counts per table
SELECT 'users' AS table_name, COUNT(*) AS n_rows FROM users
UNION ALL SELECT 'skin_profile', COUNT(*) FROM skin_profile
UNION ALL SELECT 'skin_concern', COUNT(*) FROM skin_concern
UNION ALL SELECT 'brand', COUNT(*) FROM brand
UNION ALL SELECT 'product', COUNT(*) FROM product
UNION ALL SELECT 'ingredient', COUNT(*) FROM ingredient
UNION ALL SELECT 'review', COUNT(*) FROM review
UNION ALL SELECT 'recommendation', COUNT(*) FROM recommendation
UNION ALL SELECT 'skin_profile_concern', COUNT(*) FROM skin_profile_concern
UNION ALL SELECT 'product_ingredient', COUNT(*) FROM product_ingredient
UNION ALL SELECT 'product_concern', COUNT(*) FROM product_concern
UNION ALL SELECT 'skin_profile_allergen', COUNT(*) FROM skin_profile_allergen
UNION ALL SELECT 'product_skin_type', COUNT(*) FROM product_skin_type
UNION ALL SELECT 'moisturizer', COUNT(*) FROM moisturizer
UNION ALL SELECT 'serum', COUNT(*) FROM serum
UNION ALL SELECT 'sunscreen', COUNT(*) FROM sunscreen
UNION ALL SELECT 'product_price_log', COUNT(*) FROM product_price_log;
