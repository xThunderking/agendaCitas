<section class="hero">
    <div class="hero__content card card--wide">
        <h1>Agenda tu cita en segundos</h1>
        <p>Selecciona tu nombre, fecha y hora. El sistema bloquea horarios repetidos automaticamente.</p>
        <div class="hero-tags">
            <span>Rapido</span>
            <span>Seguro</span>
            <span>Sin cruces de horario</span>
        </div>
    </div>
</section>

<section class="section-grid">
    <article class="card">
        <h2>Formulario de cita</h2>

        <?php if (!empty($success)): ?>
            <div class="alert alert--success"><?= e($success); ?></div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="alert alert--error"><?= e($error); ?></div>
        <?php endif; ?>

        <form method="POST" action="<?= e($appConfig['base_url']); ?>/book" class="form">
            <input type="hidden" name="_token" value="<?= e($csrfToken); ?>">

            <label for="client_name">Nombre completo</label>
            <input
                id="client_name"
                name="client_name"
                type="text"
                maxlength="120"
                required
                value="<?= e((string) ($old['client_name'] ?? '')); ?>"
                placeholder="Ejemplo: Maria Perez"
            >

            <label for="appointment_date">Fecha</label>
            <input
                id="appointment_date"
                name="appointment_date"
                type="date"
                min="<?= e(date('Y-m-d')); ?>"
                required
                value="<?= e((string) ($old['appointment_date'] ?? '')); ?>"
            >

            <label for="appointment_time">Horario</label>
            <input
                id="appointment_time"
                name="appointment_time"
                type="time"
                required
                step="1800"
                value="<?= e((string) ($old['appointment_time'] ?? '')); ?>"
            >

            <button type="submit" class="btn btn--primary">Registrar cita</button>
        </form>
    </article>

    <aside class="card card--accent">
        <h3>Experiencia simple</h3>
        <ul class="feature-list">
            <li>Formulario limpio estilo calendario moderno</li>
            <li>Diseno adaptado a celular y escritorio</li>
            <li>Sin duplicidad de horario y fecha</li>
            <li>Panel admin para gestionar todo</li>
        </ul>

        <div class="steps">
            <p><strong>1.</strong> Elige fecha</p>
            <p><strong>2.</strong> Selecciona horario</p>
            <p><strong>3.</strong> Confirma tu registro</p>
        </div>
    </aside>
</section>
