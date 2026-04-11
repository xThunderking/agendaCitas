<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

final class Appointment
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function all(?string $date = null): array
    {
        if ($date) {
            $stmt = $this->db->prepare(
                'SELECT * FROM appointments WHERE appointment_date = :date ORDER BY appointment_date, appointment_time'
            );
            $stmt->execute(['date' => $date]);
            return $stmt->fetchAll();
        }

        $stmt = $this->db->query('SELECT * FROM appointments ORDER BY appointment_date, appointment_time');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(string $name, string $date, string $time): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO appointments (client_name, appointment_date, appointment_time, status) VALUES (:name, :date, :time, :status)'
        );

        return $stmt->execute([
            'name' => $name,
            'date' => $date,
            'time' => $time,
            'status' => 'scheduled',
        ]);
    }

    public function update(int $id, string $name, string $date, string $time, string $status): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE appointments
             SET client_name = :name, appointment_date = :date, appointment_time = :time, status = :status
             WHERE id = :id'
        );

        return $stmt->execute([
            'id' => $id,
            'name' => $name,
            'date' => $date,
            'time' => $time,
            'status' => $status,
        ]);
    }

    public function cancel(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE appointments SET status = :status WHERE id = :id');
        return $stmt->execute([
            'id' => $id,
            'status' => 'cancelled',
        ]);
    }

    public function isSlotTaken(string $date, string $time, ?int $ignoreId = null): bool
    {
        $sql = 'SELECT COUNT(*) FROM appointments WHERE appointment_date = :date AND appointment_time = :time AND status = :status';
        $params = [
            'date' => $date,
            'time' => $time,
            'status' => 'scheduled',
        ];

        if ($ignoreId !== null) {
            $sql .= ' AND id <> :ignore_id';
            $params['ignore_id'] = $ignoreId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn() > 0;
    }
}
