
  let targetDate = null;
  let intervalId = null;
  let currentMode = 'event';
  let currentEventName = 'Mi evento';
  let originalDateValue = null;

  const ALL_IDS = ['d0','d1','d2','d3','h0','h1','m0','m1','s0','s1'];

  function todayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function toInputDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function fromInputDate(value) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function formatDate(date) {
    return date.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });
  }

  function sanitizeEventName(value) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F<>`{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  function isValidDateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function setReminderStatus(message) {
    const el = document.getElementById('reminderStatus');
    if (el) el.textContent = message || '';
  }

  function escapeICS(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function toICSDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function getReminderTitle() {
    return currentMode === 'birthday'
      ? `Aniversario: ${currentEventName}`
      : `Evento: ${currentEventName}`;
  }

  function getCalendarDescription() {
    const text = getRemainingText() || `Cuenta regresiva para ${currentEventName}.`;
    return `${text} Generado desde ${location.origin}${location.pathname}`;
  }

  function cardHTML(ch) {
    return `<div class="fc-upper"><span class="fc-digit">${ch}</span></div>
            <div class="fc-lower"><span class="fc-digit">${ch}</span></div>`;
  }

  function flip(el, newCh) {
    const oldCh = el.dataset.val;
    if (oldCh === newCh) return;
    el.innerHTML = `
      <div class="fc-upper"><span class="fc-digit">${newCh}</span></div>
      <div class="fc-lower"><span class="fc-digit">${oldCh}</span></div>
      <div class="fc-flap fc-flap-top go"><span class="fc-digit">${oldCh}</span></div>
      <div class="fc-flap fc-flap-bottom go"><span class="fc-digit">${newCh}</span></div>`;
    el.dataset.val = newCh;
    setTimeout(() => { if (el.dataset.val === newCh) el.innerHTML = cardHTML(newCh); }, 550);
  }

  function setGroup(ids, str) {
    str.split('').forEach((ch, i) => {
      const el = document.getElementById(ids[i]);
      if (el) flip(el, ch);
    });
  }

  function initCards() {
    ALL_IDS.forEach(id => {
      const el = document.getElementById(id);
      el.dataset.val = '0';
      el.innerHTML = cardHTML('0');
    });
  }

  function handleTypeChange() {
    const type = document.getElementById('countdownType').value;
    const dateInput = document.getElementById('dateInput');
    const hint = document.getElementById('typeHint');
    const label = document.getElementById('dateLabel');

    if (type === 'event') {
      dateInput.min = toInputDate(todayStart());
      label.textContent = 'Fecha del evento';
      hint.textContent = 'Solo acepta fechas desde hoy hacia adelante.';
      if (dateInput.value && fromInputDate(dateInput.value) < todayStart()) {
        dateInput.value = '';
      }
    } else {
      dateInput.removeAttribute('min');
      label.textContent = 'Fecha de nacimiento o aniversario';
      hint.textContent = 'Puede ser una fecha pasada. Se calculará el próximo aniversario.';
    }
  }

  function setRandom() {
    const type = document.getElementById('countdownType').value;
    const now = todayStart();
    let dt;

    if (type === 'birthday') {
      const year = now.getFullYear() - (Math.floor(Math.random() * 30) + 10);
      const month = Math.floor(Math.random() * 12);
      const day = Math.floor(Math.random() * 28) + 1;
      dt = new Date(year, month, day);
    } else {
      const daysAhead = Math.floor(Math.random() * 365) + 1;
      dt = new Date(now);
      dt.setDate(now.getDate() + daysAhead);
    }

    document.getElementById('dateInput').value = toInputDate(dt);
  }

  function getNextAnniversary(dateValue) {
    const now = new Date();
    const [year, month, day] = dateValue.split('-').map(Number);
    const original = new Date(year, month - 1, day, 0, 0, 0, 0);

    let next = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);
    if (next < todayStart()) {
      next.setFullYear(now.getFullYear() + 1);
    }

    let yearsPassed = now.getFullYear() - original.getFullYear();
    const anniversaryThisYear = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);
    if (todayStart() < anniversaryThisYear) yearsPassed--;

    return {
      original,
      next,
      yearsPassed: Math.max(0, yearsPassed)
    };
  }

  function startCountdown() {
    const val = document.getElementById('dateInput').value;
    const nameValue = sanitizeEventName(document.getElementById('eventNameInput').value);
    const type = document.getElementById('countdownType').value;

    if (!val) { alert('Por favor elige una fecha.'); return; }
    if (!isValidDateValue(val)) { alert('Fecha inválida. Usa una fecha real.'); return; }

    currentMode = type;
    currentEventName = nameValue || (type === 'birthday' ? 'Mi aniversario' : 'Mi evento');
    originalDateValue = val;

    const metaInfo = document.getElementById('metaInfo');
    const yearsPassedLabel = document.getElementById('yearsPassedLabel');
    const nextEventLabel = document.getElementById('nextEventLabel');

    if (type === 'event') {
      const selectedDate = fromInputDate(val);
      if (selectedDate < todayStart()) {
        alert('Esta fecha ya pasó. Para evento único, elige una fecha desde hoy hacia adelante.');
        return;
      }
      targetDate = selectedDate;
      metaInfo.style.display = 'none';
    } else {
      const data = getNextAnniversary(val);
      targetDate = data.next;
      metaInfo.style.display = 'flex';
      yearsPassedLabel.textContent = `Han pasado ${data.yearsPassed} año${data.yearsPassed === 1 ? '' : 's'}`;
      nextEventLabel.textContent = `Próximo aniversario: ${formatDate(data.next)}`;
    }

    document.getElementById('targetDateLabel').textContent = `${currentEventName} · ${formatDate(targetDate)}`;
    document.getElementById('esHoySub').textContent = type === 'birthday' ? `Hoy es ${currentEventName}` : `Llegó: ${currentEventName}`;

    const params = new URLSearchParams();
    params.set('type', type);
    params.set('date', val);
    params.set('name', currentEventName);
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('countdown-screen').style.display = 'flex';
    setReminderStatus('');

    clearInterval(intervalId);
    initCards();
    tick();
    intervalId = setInterval(tick, 1000);
  }

  function tick() {
    const diff = targetDate - Date.now();
    if (diff <= 0) {
      clearInterval(intervalId);
      showEsHoy();
      return;
    }

    const t = Math.floor(diff / 1000);
    const days = Math.floor(t / 86400);

    setGroup(['d0','d1','d2','d3'], String(Math.min(days, 9999)).padStart(4,'0'));
    setGroup(['h0','h1'], String(Math.floor(t / 3600) % 24).padStart(2,'0'));
    setGroup(['m0','m1'], String(Math.floor(t / 60) % 60).padStart(2,'0'));
    setGroup(['s0','s1'], String(t % 60).padStart(2,'0'));
  }

  function getRemainingText() {
    if (!targetDate) return null;

    const diff = targetDate - Date.now();
    if (diff <= 0) return `Hoy es: ${currentEventName}.`;

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;

    if (currentMode === 'birthday') {
      const anniversary = getNextAnniversary(originalDateValue);
      return `Faltan ${days} días, ${hours} horas, ${minutes} minutos y ${seconds} segundos para ${currentEventName}. Han pasado ${anniversary.yearsPassed} año${anniversary.yearsPassed === 1 ? '' : 's'}.`;
    }

    return `Faltan ${days} días, ${hours} horas, ${minutes} minutos y ${seconds} segundos para ${currentEventName}.`;
  }

  async function shareCountdown() {
    const remainingText = getRemainingText();
    if (!remainingText) {
      alert('Primero inicia una cuenta regresiva.');
      return;
    }

    const shareText = `${remainingText}\n\nMira la cuenta regresiva aquí: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cuenta regresiva',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Compartir cancelado');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Enlace copiado al portapapeles.');
      } catch (error) {
        alert(shareText);
      }
    }
  }

  function downloadICSReminder() {
    if (!targetDate) {
      alert('Primero inicia una cuenta regresiva.');
      return;
    }

    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const title = escapeICS(getReminderTitle());
    const description = escapeICS(getCalendarDescription());
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@sau1t0.github.io`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sau1t0//Cuenta Regresiva//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
      `DTSTART;VALUE=DATE:${toICSDate(targetDate)}`,
      `DTEND;VALUE=DATE:${toICSDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${title}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeFileName = currentEventName.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-').replace(/^-|-$/g, '') || 'recordatorio';
    a.href = url;
    a.download = `${safeFileName}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setReminderStatus('Archivo .ics generado. Puedes importarlo en Google Calendar, Apple Calendar u Outlook.');
  }

  function openGoogleCalendar() {
    if (!targetDate) {
      alert('Primero inicia una cuenta regresiva.');
      return;
    }

    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: getReminderTitle(),
      dates: `${toICSDate(targetDate)}/${toICSDate(endDate)}`,
      details: getCalendarDescription()
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
    setReminderStatus('Se abrió Google Calendar en una pestaña nueva. Revisa y guarda el evento allí.');
  }

  function setLocalReminder() {
    if (!targetDate) {
      alert('Primero inicia una cuenta regresiva.');
      return;
    }

    if (!('Notification' in window)) {
      setReminderStatus('Este navegador no permite notificaciones locales. Usa el archivo .ics.');
      return;
    }

    const msUntilEvent = targetDate - Date.now();
    if (msUntilEvent <= 0) {
      setReminderStatus('El evento ya llegó.');
      return;
    }

    const maxSafeDelay = 24 * 60 * 60 * 1000;
    if (msUntilEvent > maxSafeDelay) {
      setReminderStatus('Para fechas lejanas usa Calendario .ics o Google Calendar. Las notificaciones locales solo son fiables en las próximas 24 horas.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        setReminderStatus('Permiso de notificación denegado. Usa Calendario .ics o Google Calendar.');
        return;
      }

      setTimeout(() => {
        new Notification('Cuenta regresiva', {
          body: `${currentEventName} ha llegado.`,
          tag: 'cuenta-regresiva-evento'
        });
      }, msUntilEvent);

      setReminderStatus('Recordatorio local activado. Mantén el navegador abierto para recibirlo.');
    });
  }

  function showEsHoy() {
    document.getElementById('countdown-screen').style.display = 'none';
    document.getElementById('esHoy-screen').style.display = 'flex';
  }

  function resetAll() {
    clearInterval(intervalId);
    intervalId = null;
    targetDate = null;
    originalDateValue = null;

    history.replaceState(null, '', location.pathname);

    document.getElementById('countdown-screen').style.display = 'none';
    document.getElementById('esHoy-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('dateInput').value = '';
    setReminderStatus('');
  }

  function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const date = params.get('date');
    const name = params.get('name');

    handleTypeChange();

    if ((type === 'event' || type === 'birthday') && date && isValidDateValue(date)) {
      document.getElementById('countdownType').value = type;
      handleTypeChange();
      document.getElementById('dateInput').value = date;
      if (name) document.getElementById('eventNameInput').value = sanitizeEventName(name);
      startCountdown();
    }
  }

  document.addEventListener('DOMContentLoaded', loadFromURL);
