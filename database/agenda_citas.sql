CREATE DATABASE IF NOT EXISTS agenda_citas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agenda_citas;

DROP TABLE IF EXISTS class_registrations;

CREATE TABLE class_registrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    last_name_paterno VARCHAR(80) NOT NULL,
    last_name_materno VARCHAR(80) NOT NULL,
    first_names VARCHAR(120) NOT NULL,
    class_date DATE NOT NULL,
    class_slot ENUM('07:00-08:00', '09:00-10:00') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_class_date_slot (class_date, class_slot),
    UNIQUE KEY uq_class_person (
        class_date,
        class_slot,
        last_name_paterno,
        last_name_materno,
        first_names
    ),
    UNIQUE KEY uq_person_global (
        last_name_paterno,
        last_name_materno,
        first_names
    )
) ENGINE=InnoDB;

DROP TABLE IF EXISTS blocked_class_days;

CREATE TABLE blocked_class_days (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_date DATE NOT NULL,
    reason VARCHAR(180) NOT NULL DEFAULT 'Dia sin clases',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_blocked_class_date (class_date)
) ENGINE=InnoDB;
