// Operating calendar per country: working days, hours, cut-off and closures. Shared by the Operating calendar page
// and by business-hour SLA timing (orders). Closures that apply to Services only don't stop the procurement clock.

const HC_COUNTRIES = [
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', tz: 'SGT (UTC+8)', days: [1, 2, 3, 4, 5], hours: '09:00–18:00', regions: ['Central', 'East', 'West (Tuas)'],
    cutoff: '14:00', delays: [],
    entries: [
      ['2026-01-01', '2026-01-01', 'public', "New Year's Day"],
      ['2026-02-17', '2026-02-18', 'public', 'Chinese New Year'],
      ['2026-03-21', '2026-03-21', 'public', 'Hari Raya Puasa'],
      ['2026-04-03', '2026-04-03', 'public', 'Good Friday'],
      ['2026-05-01', '2026-05-01', 'public', 'Labour Day'],
      ['2026-05-27', '2026-05-27', 'public', 'Hari Raya Haji'],
      ['2026-05-31', '2026-06-01', 'public', 'Vesak Day (observed Mon)'],
      ['2026-08-09', '2026-08-10', 'public', 'National Day (observed Mon)'],
      ['2026-10-23', '2026-10-23', 'adhoc', 'Singapore Hub stocktake', 'Procurement · Country'],
      ['2026-11-08', '2026-11-09', 'public', 'Deepavali (observed Mon)'],
      ['2026-12-24', '2026-12-24', 'adhoc', 'Year-end courier cut-off', 'Both · Country'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day']
    ] },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', tz: 'MYT (UTC+8)', days: [1, 2, 3, 4, 5], hours: '09:00–18:00', regions: ['Kuala Lumpur', 'Selangor', 'Penang', 'Johor'],
    cutoff: '13:00', delays: [[1, 'Courier X depot move', '22 Oct']],
    entries: [
      ['2026-08-31', '2026-08-31', 'public', 'Merdeka Day'],
      ['2026-09-16', '2026-09-16', 'public', 'Malaysia Day'],
      ['2026-10-21', '2026-10-22', 'adhoc', 'Courier X depot move', 'Procurement · Region: Kuala Lumpur'],
      ['2026-11-08', '2026-11-08', 'public', 'Deepavali'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day']
    ] },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', tz: 'WIB (UTC+7)', days: [1, 2, 3, 4, 5], hours: '08:00–17:00', regions: ['Jakarta', 'Surabaya', 'Bali'],
    cutoff: '12:00', delays: [[3, 'Indonesia customs', '30 Oct']],
    entries: [
      ['2026-08-17', '2026-08-17', 'public', 'Independence Day'],
      ['2026-10-19', '2026-10-30', 'adhoc', 'Customs slowdown', 'Procurement · Country'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day']
    ] },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', tz: 'AEDT (UTC+11)', days: [1, 2, 3, 4, 5], hours: '08:30–17:30', regions: ['NSW', 'VIC', 'QLD', 'WA'],
    cutoff: '15:00', delays: [],
    entries: [
      ['2026-10-05', '2026-10-05', 'public', 'Labour Day (NSW)'],
      ['2026-11-03', '2026-11-03', 'public', 'Melbourne Cup (VIC)'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day'],
      ['2026-12-28', '2026-12-28', 'public', 'Boxing Day (observed)']
    ] },
  { code: 'US', flag: '🇺🇸', name: 'United States', tz: 'ET (UTC−4)', days: [1, 2, 3, 4, 5], hours: '09:00–18:00', regions: ['Northeast', 'Southeast', 'Midwest', 'West'],
    cutoff: '15:00', delays: [[2, 'Hurricane routing, Southeast', '20 Oct']],
    entries: [
      ['2026-10-12', '2026-10-12', 'public', 'Columbus Day'],
      ['2026-10-18', '2026-10-20', 'adhoc', 'Hurricane routing, Southeast', 'Both · Region: Southeast'],
      ['2026-11-11', '2026-11-11', 'public', 'Veterans Day'],
      ['2026-11-26', '2026-11-26', 'public', 'Thanksgiving'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day']
    ] },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', tz: 'BST (UTC+1)', days: [1, 2, 3, 4, 5], hours: '09:00–17:30', regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    cutoff: '14:00', delays: [],
    entries: [
      ['2026-08-31', '2026-08-31', 'public', 'Summer Bank Holiday'],
      ['2026-12-25', '2026-12-25', 'public', 'Christmas Day'],
      ['2026-12-28', '2026-12-28', 'public', 'Boxing Day (observed)']
    ] },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', tz: 'GST (UTC+4)', days: [1, 2, 3, 4, 5], hours: '09:00–18:00', regions: ['Dubai', 'Abu Dhabi'],
    cutoff: '13:00', delays: [],
    entries: [
      ['2026-12-02', '2026-12-03', 'public', 'National Day']
    ] }
];

const calCountry = cc => HC_COUNTRIES.find(c => c.code === cc) || HC_COUNTRIES[0];
const calIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Working window for a country as minutes from midnight, e.g. 09:00–18:00 → [540, 1080]
function calHours(cc) {
  const [a, b] = calCountry(cc).hours.split('–').map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
  return [a, b];
}
const calHoursPerDay = cc => { const [a, b] = calHours(cc); return (b - a) / 60; };

// Closed all day: weekend, public holiday or a closure that covers procurement
function calClosed(cc, d) {
  const c = calCountry(cc);
  if (!c.days.includes(d.getDay())) return true;
  const iso = calIso(d);
  return c.entries.some(([from, to, type, , meta]) => iso >= from && iso <= to && (type === 'public' || !meta || !meta.startsWith('Services')));
}

// Business minutes between two times in the country's working hours. Times are read as local to the country.
function bizMinutes(cc, from, to) {
  let a = new Date(from), b = new Date(to);
  if (!(b > a)) return 0;
  const [open, close] = calHours(cc);
  let mins = 0;
  const day = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  for (let guard = 0; day <= b && guard < 800; guard++, day.setDate(day.getDate() + 1)) {
    if (calClosed(cc, day)) continue;
    const s = new Date(day.getTime() + open * 6e4);
    const e = new Date(day.getTime() + close * 6e4);
    const lo = a > s ? a : s;
    const hi = b < e ? b : e;
    if (hi > lo) mins += (hi - lo) / 6e4;
  }
  return Math.round(mins);
}

// The moment a number of business minutes after a start time (for due dates)
function bizAdd(cc, from, minutes) {
  const [open, close] = calHours(cc);
  const t = new Date(from);
  let left = minutes;
  const day = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  for (let guard = 0; guard < 800; guard++, day.setDate(day.getDate() + 1)) {
    if (calClosed(cc, day)) continue;
    const s = new Date(day.getTime() + open * 6e4);
    const e = new Date(day.getTime() + close * 6e4);
    const lo = t > s ? t : s;
    if (lo >= e) continue;
    const avail = (e - lo) / 6e4;
    if (left <= avail) return new Date(lo.getTime() + left * 6e4);
    left -= avail;
  }
  return new Date(t.getTime() + minutes * 6e4);
}

// The moment a number of business minutes before a time (used to seed realistic timelines)
function bizSub(cc, to, minutes) {
  const [open, close] = calHours(cc);
  const t = new Date(to);
  let left = minutes;
  const day = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  for (let guard = 0; guard < 800; guard++, day.setDate(day.getDate() - 1)) {
    if (calClosed(cc, day)) continue;
    const s = new Date(day.getTime() + open * 6e4);
    const e = new Date(day.getTime() + close * 6e4);
    const hi = t < e ? t : e;
    if (hi <= s) continue;
    const avail = (hi - s) / 6e4;
    if (left <= avail) return new Date(hi.getTime() - left * 6e4);
    left -= avail;
  }
  return new Date(t.getTime() - minutes * 6e4);
}
