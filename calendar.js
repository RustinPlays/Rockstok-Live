(function () {
  const CALENDAR_TIME_ZONE = 'Pacific/Auckland';
  const DEFAULT_GIG_DURATION = 'PT3H';

  function escapeCalendarText(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function parseTime(value) {
    const match = String(value || '').match(/\b(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\b/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const meridiem = (match[3] || '').toLowerCase();

    if (minutes > 59 || (meridiem && (hours < 1 || hours > 12)) || (!meridiem && hours > 23)) {
      return null;
    }

    if (meridiem === 'am' && hours === 12) hours = 0;
    if (meridiem === 'pm' && hours !== 12) hours += 12;

    return `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
  }

  function getNextDate(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10).replaceAll('-', '');
  }

  function getCalendarLink(gig) {
    const date = String(gig?.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    const calendarDate = date.replaceAll('-', '');
    const startTime = parseTime(gig.time);
    const title = gig.title || 'Rockstok Live';
    const location = gig.mapAddress || [gig.venue, gig.location].filter(Boolean).join(', ');
    const ticketUrl = gig.ticketLink || gig.ticketUrl || '';
    const descriptionParts = [gig.description || 'Live music with Rockstok.'];

    if (gig.time) descriptionParts.push(`Time: ${gig.time}`);
    if (ticketUrl) descriptionParts.push(`Details: ${ticketUrl}`);

    const eventLines = startTime
      ? [`DTSTART;TZID=${CALENDAR_TIME_ZONE}:${calendarDate}T${startTime}`, `DURATION:${DEFAULT_GIG_DURATION}`]
      : [`DTSTART;VALUE=DATE:${calendarDate}`, `DTEND;VALUE=DATE:${getNextDate(date)}`];

    const uidTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rockstok-live';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rockstok//Gig Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uidTitle}-${calendarDate}@rockstok`,
      `DTSTAMP:${timestamp}`,
      ...eventLines,
      `SUMMARY:${escapeCalendarText(title)}`,
      `LOCATION:${escapeCalendarText(location)}`,
      `DESCRIPTION:${escapeCalendarText(descriptionParts.join('\n'))}`,
      ...(ticketUrl ? [`URL:${ticketUrl}`] : []),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return {
      href: `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`,
      filename: `${uidTitle}-${date}.ics`
    };
  }

  window.ROCKSTOK_CALENDAR = { getCalendarLink };
})();
