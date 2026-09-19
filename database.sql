-- ============================================================================
-- EGAC CONSTRUCTION — CLIENT REQUEST DATABASE
-- ----------------------------------------------------------------------------
-- HOW TO USE ON HOSTINGER
--   1. hPanel → Databases → MySQL Databases → create a database and a user
--   2. open phpMyAdmin for that database
--   3. Import tab → choose this file → Go
--   4. put the database name, user and password into /api/config.php
--
-- This file creates tables only. It contains no credentials and no data.
-- Safe to run twice: every statement is IF NOT EXISTS.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------- clients --
-- One row per submitted request from the website contact form.
CREATE TABLE IF NOT EXISTS `clients` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,

  `full_name`        VARCHAR(150)  NOT NULL,
  `phone`            VARCHAR(40)   NOT NULL,
  `email`            VARCHAR(190)  NOT NULL,
  `company_name`     VARCHAR(150)  NOT NULL,
  `service`          VARCHAR(60)   NOT NULL,   -- cladding, curtain-wall, …
  `project_location` VARCHAR(190)  NOT NULL,
  `project_type`     VARCHAR(60)   NOT NULL,   -- residential, commercial, …
  `project_details`  TEXT          NOT NULL,

  `project_size`     VARCHAR(80)       NULL,   -- optional, free text
  `attachments`      TEXT              NULL,   -- JSON array of stored files
  `language`         CHAR(2)       NOT NULL DEFAULT 'en',
  `source_page`      VARCHAR(255)      NULL,

  `ip_address`       VARBINARY(16)     NULL,   -- packed, see helpers in lib.php
  `user_agent`       VARCHAR(255)      NULL,
  `fingerprint`      CHAR(64)          NULL,   -- duplicate-submission guard

  `status`           ENUM('New','In progress','Quoted','Won','Lost','Spam')
                     NOT NULL DEFAULT 'New',
  `notes`            TEXT              NULL,   -- internal, filled in by staff

  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status`     (`status`),
  KEY `idx_email`      (`email`),
  KEY `idx_service`    (`service`),
  KEY `idx_dedupe`     (`fingerprint`, `created_at`),
  KEY `idx_rate`       (`ip_address`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------- submission_log --
-- Every accepted or rejected attempt, used for rate limiting and for seeing
-- whether the form is being hammered. Holds no personal data beyond the IP.
CREATE TABLE IF NOT EXISTS `submission_log` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_address` VARBINARY(16)    NULL,
  `outcome`    VARCHAR(30)  NOT NULL,          -- stored | invalid | rate | spam
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_time` (`ip_address`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
