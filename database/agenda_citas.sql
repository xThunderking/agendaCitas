CREATE DATABASE IF NOT EXISTS agenda_citas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agenda_citas;

DROP TABLE IF EXISTS appointments;

CREATE TABLE appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(120) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('scheduled', 'cancelled', 'completed') NOT NULL DEFAULT 'scheduled',
    active_slot VARCHAR(40)
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'scheduled' THEN CONCAT(appointment_date, ' ', appointment_time)
                ELSE NULL
            END
        ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_appointments_date_time (appointment_date, appointment_time),
    INDEX idx_appointments_status (status),
    UNIQUE KEY uq_active_slot (active_slot)
) ENGINE=InnoDB;
