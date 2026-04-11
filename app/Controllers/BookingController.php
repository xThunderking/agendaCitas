<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Csrf;
use App\Core\Database;
use App\Core\Session;
use App\Models\Appointment;

final class BookingController extends Controller
{
    public function create(): void
    {
        Session::start();
        $flashSuccess = Session::flash('success');
        $flashError = Session::flash('error');

        $this->view('booking/create', [
            'title' => 'Agenda tu cita',
            'csrfToken' => Csrf::token(),
            'success' => $flashSuccess,
            'error' => $flashError,
            'old' => Session::get('old', []),
        ]);

        Session::remove('old');
    }

    public function store(): void
    {
        Session::start();

        if (!Csrf::validate($_POST['_token'] ?? null)) {
            Session::flash('error', 'La solicitud no es valida. Intenta nuevamente.');
            $this->redirect('book');
        }

        $name = trim((string) ($_POST['client_name'] ?? ''));
        $date = (string) ($_POST['appointment_date'] ?? '');
        $time = (string) ($_POST['appointment_time'] ?? '');

        Session::set('old', [
            'client_name' => $name,
            'appointment_date' => $date,
            'appointment_time' => $time,
        ]);

        $validationError = $this->validateInput($name, $date, $time);
        if ($validationError !== null) {
            Session::flash('error', $validationError);
            $this->redirect('book');
        }

        $appointmentModel = new Appointment(Database::connection($this->config));
        if ($appointmentModel->isSlotTaken($date, $time)) {
            Session::flash('error', 'Ese horario ya fue reservado. Elige otro.');
            $this->redirect('book');
        }

        $appointmentModel->create($name, $date, $time);

        Session::remove('old');
        Session::flash('success', 'Tu cita se registro correctamente.');
        $this->redirect('book');
    }

    private function validateInput(string $name, string $date, string $time): ?string
    {
        if ($name === '' || mb_strlen($name) < 3) {
            return 'Escribe un nombre valido de al menos 3 caracteres.';
        }

        if (!$this->isValidDate($date)) {
            return 'Selecciona una fecha valida.';
        }

        if (!$this->isValidTime($time)) {
            return 'Selecciona un horario valido.';
        }

        if ($date < date('Y-m-d')) {
            return 'No puedes agendar en fechas pasadas.';
        }

        return null;
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
