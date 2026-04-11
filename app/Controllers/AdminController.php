<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Csrf;
use App\Core\Database;
use App\Core\Session;
use App\Models\Appointment;

final class AdminController extends Controller
{
    public function index(): void
    {
        $this->dashboard();
    }

    public function dashboard(): void
    {
        Session::start();

        $dateFilter = trim((string) ($_GET['date'] ?? ''));
        $appointments = (new Appointment(Database::connection($this->config)))->all($dateFilter !== '' ? $dateFilter : null);

        $this->view('admin/dashboard', [
            'title' => 'Panel de citas',
            'appointments' => $appointments,
            'dateFilter' => $dateFilter,
            'csrfToken' => Csrf::token(),
            'success' => Session::flash('success'),
            'error' => Session::flash('error'),
        ]);
    }

    public function editForm(): void
    {
        Session::start();

        $id = (int) ($_GET['id'] ?? 0);
        $appointment = (new Appointment(Database::connection($this->config)))->find($id);

        if (!$appointment) {
            Session::flash('error', 'La cita no existe.');
            $this->redirect('admin/citas');
        }

        $this->view('admin/edit', [
            'title' => 'Editar cita',
            'appointment' => $appointment,
            'csrfToken' => Csrf::token(),
            'error' => Session::flash('error'),
        ]);
    }

    public function update(): void
    {
        Session::start();

        if (!Csrf::validate($_POST['_token'] ?? null)) {
            Session::flash('error', 'La solicitud no es valida.');
            $this->redirect('admin/citas');
        }

        $id = (int) ($_POST['id'] ?? 0);
        $name = trim((string) ($_POST['client_name'] ?? ''));
        $date = (string) ($_POST['appointment_date'] ?? '');
        $time = (string) ($_POST['appointment_time'] ?? '');
        $status = (string) ($_POST['status'] ?? 'scheduled');

        if ($id <= 0 || $name === '' || !$this->isValidDate($date) || !$this->isValidTime($time)) {
            Session::flash('error', 'Datos invalidos para actualizar la cita.');
            $this->redirect('admin/editar?id=' . $id);
        }

        if (!in_array($status, ['scheduled', 'cancelled', 'completed'], true)) {
            Session::flash('error', 'Estado de cita no valido.');
            $this->redirect('admin/editar?id=' . $id);
        }

        $appointmentModel = new Appointment(Database::connection($this->config));

        if ($status === 'scheduled' && $appointmentModel->isSlotTaken($date, $time, $id)) {
            Session::flash('error', 'Ese horario ya esta reservado por otra cita activa.');
            $this->redirect('admin/editar?id=' . $id);
        }

        $appointmentModel->update($id, $name, $date, $time, $status);
        Session::flash('success', 'Cita actualizada correctamente.');
        $this->redirect('admin/citas');
    }

    public function cancel(): void
    {
        Session::start();

        if (!Csrf::validate($_POST['_token'] ?? null)) {
            Session::flash('error', 'La solicitud no es valida.');
            $this->redirect('admin/citas');
        }

        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Session::flash('error', 'Cita invalida.');
            $this->redirect('admin/citas');
        }

        (new Appointment(Database::connection($this->config)))->cancel($id);
        Session::flash('success', 'Cita cancelada exitosamente.');
        $this->redirect('admin/citas');
    }

    private function isValidDate(string $date): bool
    {
        $parts = explode('-', $date);
        if (count($parts) !== 3) {
            return false;
        }

        return checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0]);
    }

    private function isValidTime(string $time): bool
    {
        return (bool) preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time);
    }
}
