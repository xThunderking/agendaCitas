<section class="section-grid section-grid--single">
    <article class="card">
        <h1>Editar cita #<?= e((string) $appointment['id']); ?></h1>

        <?php if (!empty($error)): ?>
            <div class="alert alert--error"><?= e($error); ?></div>
        <?php endif; ?>

        <form method="POST" action="<?= e($appConfig['base_url']); ?>/admin/actualizar" class="form">
            <input type="hidden" name="_token" value="<?= e($csrfToken); ?>">
            <input type="hidden" name="id" value="<?= e((string) $appointment['id']); ?>">

            <label for="client_name">Nombre</label>
            <input id="client_name" name="client_name" type="text" required maxlength="120" value="<?= e((string) $appointment['client_name']); ?>">

            <label for="appointment_date">Fecha</label>
            <input id="appointment_date" name="appointment_date" type="date" required value="<?= e((string) $appointment['appointment_date']); ?>">

            <label for="appointment_time">Horario</label>
            <input id="appointment_time" name="appointment_time" type="time" required step="60" value="<?= e(substr((string) $appointment['appointment_time'], 0, 5)); ?>">

            <label for="status">Estado</label>
            <select id="status" name="status" required>
                <?php foreach (['scheduled' => 'Programada', 'cancelled' => 'Cancelada', 'completed' => 'Completada'] as $value => $label): ?>
                    <option value="<?= e($value); ?>" <?= $appointment['status'] === $value ? 'selected' : ''; ?>><?= e($label); ?></option>
                <?php endforeach; ?>
            </select>

            <button type="submit" class="btn btn--primary">Guardar cambios</button>
            <a href="<?= e($appConfig['base_url']); ?>/admin/citas" class="btn btn--ghost">Volver</a>
        </form>
    </article>
</section>
