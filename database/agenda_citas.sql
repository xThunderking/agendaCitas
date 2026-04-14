CREATE DATABASE IF NOT EXISTS agenda_citas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agenda_citas;

DROP TABLE IF EXISTS class_registrations;

CREATE TABLE class_registrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    class_date DATE NOT NULL,
    class_slot ENUM('07:00-08:00', '09:00-10:00') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_class_date_slot (class_date, class_slot),
    UNIQUE KEY uq_full_name (full_name)
) ENGINE=InnoDB;
