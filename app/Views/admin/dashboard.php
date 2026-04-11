<section class="dashboard-hero card card--wide">
    <div>
        <p class="eyebrow">Agenda movil</p>
        <h1>Panel de citas</h1>
        <p>Vista tipo agenda para gestionar citas de forma rapida desde telefono.</p>
    </div>
</section>

<section class="card card--wide">
    <?php if (!empty($success)): ?>
        <div class="alert alert--success"><?= e($success); ?></div>
    <?php endif; ?>

    <?php if (!empty($error)): ?>
        <div class="alert alert--error"><?= e($error); ?></div>
    <?php endif; ?>

    <form method="GET" action="<?= e($appConfig['base_url']); ?>/admin/citas" class="filters filters--agenda">
        <label for="date">Filtrar por fecha</label>
        <input id="date" name="date" type="date" value="<?= e($dateFilter); ?>">
        <button type="submit" class="btn btn--secondary">Filtrar</button>
        <a class="btn btn--ghost" href="<?= e($appConfig['base_url']); ?>/admin/citas">Limpiar</a>
    </form>

    <?php
    $statusLabels = [
        'scheduled' => 'Programada',
        'cancelled' => 'Cancelada',
        'completed' => 'Completada',
    ];

    $grouped = [];
    foreach ($appointments as $appointment) {
        $grouped[$appointment['appointment_date']][] = $appointment;
    }
    ksort($grouped);

    $weekdayMap = [
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miercoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sabado',
        7 => 'Domingo',
    ];

    $monthMap = [
        1 => 'Ene',
        2 => 'Feb',
        3 => 'Mar',
        4 => 'Abr',
        5 => 'May',
        6 => 'Jun',
        7 => 'Jul',
        8 => 'Ago',
        9 => 'Sep',
        10 => 'Oct',
        11 => 'Nov',
        12 => 'Dic',
    ];
    ?>

    <?php if (empty($grouped)): ?>
        <article class="appointment-card appointment-card--empty">
            <p>No hay citas registradas para esta vista.</p>
        </article>
    <?php else: ?>
        <div class="agenda-view">
            <?php foreach ($grouped as $date => $items): ?>
                <?php
                $dateObj = new DateTimeImmutable($date);
                $weekday = $weekdayMap[(int) $dateObj->format('N')] ?? '';
                $dayNumber = $dateObj->format('d');
                $month = $monthMap[(int) $dateObj->format('n')] ?? '';
                ?>
                <section class="agenda-day">
                    <header class="agenda-day__header">
                        <div class="agenda-day__date-block">
                            <span class="agenda-day__day"><?= e($dayNumber); ?></span>
                            <span class="agenda-day__month"><?= e($month); ?></span>
                        </div>
                        <div class="agenda-day__meta">
                            <h2><?= e($weekday); ?></h2>
                            <p><?= e($date); ?> · <?= e((string) count($items)); ?> cita(s)</p>
                        </div>
                    </header>

                    <div class="agenda-day__timeline">
                        <?php foreach ($items as $appointment): ?>
                            <article class="agenda-item status-accent--<?= e((string) $appointment['status']); ?>">
                                <div class="agenda-item__time">
                                    <?= e(substr((string) $appointment['appointment_time'], 0, 5)); ?>
                                </div>

                                <div class="agenda-item__content">
                                    <div class="agenda-item__top">
                                        <h3><?= e((string) $appointment['client_name']); ?></h3>
                                        <span class="status status--<?= e((string) $appointment['status']); ?>">
                                            <?= e($statusLabels[$appointment['status']] ?? 'Sin estado'); ?>
                                        </span>
                                    </div>

                                    <p class="agenda-item__id">Cita #<?= e((string) $appointment['id']); ?></p>

                                    <div class="agenda-item__actions">
                                        <a class="btn btn--secondary" href="<?= e($appConfig['base_url']); ?>/admin/editar?id=<?= e((string) $appointment['id']); ?>">Editar</a>

                                        <?php if ($appointment['status'] === 'scheduled'): ?>
                                            <form method="POST" action="<?= e($appConfig['base_url']); ?>/admin/cancelar" class="inline-form" onsubmit="return confirm('Deseas cancelar esta cita?');">
                                                <input type="hidden" name="_token" value="<?= e($csrfToken); ?>">
                                                <input type="hidden" name="id" value="<?= e((string) $appointment['id']); ?>">
                                                <button type="submit" class="btn btn--danger">Cancelar</button>
                                            </form>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>
