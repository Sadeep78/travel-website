-- Travel Partner — full database schema
CREATE DATABASE IF NOT EXISTS `travel_site`;
USE `travel_site`;

CREATE TABLE IF NOT EXISTS `destinations` (
  `id` INT PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `price` VARCHAR(50) NOT NULL,
  `price_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `category` ENUM('Cultural', 'Scenic', 'Coastal') NOT NULL DEFAULT 'Cultural',
  `region` VARCHAR(100) NOT NULL DEFAULT '',
  `image` VARCHAR(255) NOT NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `available_from` DATE NOT NULL DEFAULT '2025-01-01',
  `available_to` DATE NOT NULL DEFAULT '2027-12-31',
  UNIQUE KEY `uk_destinations_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_contacts_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `ref` VARCHAR(20) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `price` VARCHAR(50) NOT NULL,
  `price_amount` DECIMAL(10, 2) NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `billing_name` VARCHAR(255) NOT NULL,
  `billing_email` VARCHAR(255) NOT NULL,
  `billing_phone` VARCHAR(50) NOT NULL,
  `billing_address` TEXT NOT NULL,
  `billing_city` VARCHAR(100) NOT NULL,
  `billing_state` VARCHAR(100) NOT NULL,
  `billing_zip` VARCHAR(20) NOT NULL,
  `billing_country` VARCHAR(100) NOT NULL,
  `shipping_same` TINYINT(1) NOT NULL DEFAULT 1,
  `shipping_name` VARCHAR(255) NULL,
  `shipping_address` TEXT NULL,
  `shipping_city` VARCHAR(100) NULL,
  `shipping_state` VARCHAR(100) NULL,
  `shipping_zip` VARCHAR(20) NULL,
  `shipping_country` VARCHAR(100) NULL,
  `payment_method` ENUM('card', 'cod') NOT NULL DEFAULT 'cod',
  `card_last4` VARCHAR(4) NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled', 'delivered') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bookings_ref` (`ref`),
  INDEX `idx_bookings_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
