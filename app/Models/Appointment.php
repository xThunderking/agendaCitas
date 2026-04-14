<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

final class Appointment
{
    private ?bool $useLegacyAppointments = null;

    public function __construct(private readonly PDO $db)
    {
    }

    public function all(?string $date = null): array
    {
        if (!$this->usesLegacyAppointments()) {
            return $this->allFromClassRegistrations($date);
        }

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
        if (!$this->usesLegacyAppointments()) {
            $stmt = $this->db->prepare(
                "SELECT
                    id,
                    TRIM(CONCAT(last_name_paterno, ' ', last_name_materno, ' ', first_names)) AS client_name,
                    class_date AS appointment_date,
                    CONCAT(SUBSTRING_INDEX(class_slot, '-', 1), ':00') AS appointment_time,
                    'scheduled' AS status
                 FROM class_registrations
                 WHERE id = :id
                 LIMIT 1"
            );
            $stmt->execute(['id' => $id]);
            $row = $stmt->fetch();

            return $row ?: null;
        }

        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(string $name, string $date, string $time): bool
    {
        if (!$this->usesLegacyAppointments()) {
            $slot = $this->slotFromTime($time);
            if ($slot === null) {
                return false;
            }

            [$lastNamePaterno, $lastNameMaterno, $firstNames] = $this->splitFullName($name);
            $stmt = $this->db->prepare(
                'INSERT INTO class_registrations (last_name_paterno, last_name_materno, first_names, class_date, class_slot)
                 VALUES (:last_name_paterno, :last_name_materno, :first_names, :class_date, :class_slot)'
            );

            return $stmt->execute([
                'last_name_paterno' => $lastNamePaterno,
                'last_name_materno' => $lastNameMaterno,
                'first_names' => $firstNames,
                'class_date' => $date,
                'class_slot' => $slot,
            ]);
        }

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
        if (!$this->usesLegacyAppointments()) {
            if ($status === 'cancelled') {
                return $this->cancel($id);
            }

            $slot = $this->slotFromTime($time);
            if ($slot === null) {
                return false;
            }

            [$lastNamePaterno, $lastNameMaterno, $firstNames] = $this->splitFullName($name);
            $stmt = $this->db->prepare(
                'UPDATE class_registrations
                 SET last_name_paterno = :last_name_paterno,
                     last_name_materno = :last_name_materno,
                     first_names = :first_names,
                     class_date = :class_date,
                     class_slot = :class_slot
                 WHERE id = :id'
            );

            return $stmt->execute([
                'id' => $id,
                'last_name_paterno' => $lastNamePaterno,
                'last_name_materno' => $lastNameMaterno,
                'first_names' => $firstNames,
                'class_date' => $date,
                'class_slot' => $slot,
            ]);
        }

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
        if (!$this->usesLegacyAppointments()) {
            $stmt = $this->db->prepare('DELETE FROM class_registrations WHERE id = :id');
            return $stmt->execute(['id' => $id]);
        }

        $stmt = $this->db->prepare('UPDATE appointments SET status = :status WHERE id = :id');
        return $stmt->execute([
            'id' => $id,
            'status' => 'cancelled',
        ]);
    }

    public function isSlotTaken(string $date, string $time, ?int $ignoreId = null): bool
    {
        if (!$this->usesLegacyAppointments()) {
            $slot = $this->slotFromTime($time);
            if ($slot === null) {
                return true;
            }

            $sql = 'SELECT COUNT(*) FROM class_registrations WHERE class_date = :date AND class_slot = :class_slot';
            $params = [
                'date' => $date,
                'class_slot' => $slot,
            ];

            if ($ignoreId !== null) {
                $sql .= ' AND id <> :ignore_id';
                $params['ignore_id'] = $ignoreId;
            }

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            return (int) $stmt->fetchColumn() > 0;
        }

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

    private function usesLegacyAppointments(): bool
    {
        if ($this->useLegacyAppointments !== null) {
            return $this->useLegacyAppointments;
        }

        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = :table_name'
        );
        $stmt->execute(['table_name' => 'appointments']);
        $this->useLegacyAppointments = (int) $stmt->fetchColumn() > 0;

        return $this->useLegacyAppointments;
    }

    private function allFromClassRegistrations(?string $date = null): array
    {
        $sql = "SELECT
                    id,
                    TRIM(CONCAT(last_name_paterno, ' ', last_name_materno, ' ', first_names)) AS client_name,
                    class_date AS appointment_date,
                    CONCAT(SUBSTRING_INDEX(class_slot, '-', 1), ':00') AS appointment_time,
                    'scheduled' AS status
                FROM class_registrations";
        $params = [];

        if ($date) {
            $sql .= ' WHERE class_date = :date';
            $params['date'] = $date;
        }

        $sql .= ' ORDER BY class_date, class_slot';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    private function slotFromTime(string $time): ?string
    {
        $hourMinute = substr($time, 0, 5);

        return match ($hourMinute) {
            '07:00' => '07:00-08:00',
            '09:00' => '09:00-10:00',
            default => null,
        };
    }

    private function splitFullName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        if (count($parts) === 0) {
            return ['', '', ''];
        }

        if (count($parts) === 1) {
            return [$parts[0], '.', '.'];
        }

        if (count($parts) === 2) {
            return [$parts[0], $parts[1], '.'];
        }

        $lastNamePaterno = (string) array_shift($parts);
        $lastNameMaterno = (string) array_shift($parts);
        $firstNames = implode(' ', $parts);

        return [$lastNamePaterno, $lastNameMaterno, $firstNames !== '' ? $firstNames : '.'];
    }
}
