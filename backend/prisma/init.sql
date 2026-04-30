-- =============================================================================
-- CleanHub — MySQL / MariaDB (use in DBeaver: run on database `cleanhub`)
-- Matches: backend/prisma/schema.prisma
--
-- In backend/.env set:
--   DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/cleanhub"
--
-- Valid status values (API): RECEIVED, PROCESSING, READY, DELIVERED (defaults to PROCESSING for new rows)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS cleanhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cleanhub;

-- "Order" is reserved; we use backticks (Prisma default table names for this model)

CREATE TABLE IF NOT EXISTS `Order` (
  `id`                    CHAR(36)     NOT NULL,
  `customerName`        VARCHAR(191) NOT NULL,
  `phone`                VARCHAR(64)  NOT NULL,
  `status`               VARCHAR(32)  NOT NULL DEFAULT 'PROCESSING',
  `totalAmount`          DOUBLE       NOT NULL,
  `estimatedDeliveryDate` DATETIME(3)  NULL,
  `createdAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `OrderLine` (
  `id`            CHAR(36)     NOT NULL,
  `orderId`       CHAR(36)     NOT NULL,
  `garmentType`   VARCHAR(128) NOT NULL,
  `quantity`      INT          NOT NULL,
  `pricePerItem`  DOUBLE       NOT NULL,
  PRIMARY KEY (`id`),
  KEY `OrderLine_orderId_idx` (`orderId`),
  CONSTRAINT `OrderLine_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `User` (
  `id`            CHAR(36)     NOT NULL,
  `username`      VARCHAR(191) NOT NULL,
  `passwordHash`  VARCHAR(191) NOT NULL,
  `displayName`   VARCHAR(191) NULL,
  `email`         VARCHAR(191) NULL,
  `phone`         VARCHAR(191) NULL,
  `role`          VARCHAR(32)  NOT NULL DEFAULT 'user',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`)
) ENGINE = InnoDB;
