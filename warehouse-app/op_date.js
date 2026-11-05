const OP_DAY = 'CAST(@opDay AS date)';
// The chosen day at the current time of day, so same-day entries keep their order.
const OP_STAMP = 'DATEADD(day, DATEDIFF(day, CAST(GETDATE() AS date), CAST(@opDay AS date)), GETDATE())';
const MIN_DAY = '2000-01-01';

function businessDay() {
  const cairo = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const month = String(cairo.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cairo.getUTCDate()).padStart(2, '0');
  return `${cairo.getUTCFullYear()}-${month}-${day}`;
}

function parseOpDay(value, fallback) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return fallback || businessDay();
  const parsed = new Date(`${text}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== text || text < MIN_DAY) {
    throw new Error('التاريخ غير صحيح');
  }
  if (text > businessDay()) throw new Error('مينفعش تختار تاريخ في المستقبل');
  return text;
}

module.exports = { OP_DAY, OP_STAMP, businessDay, parseOpDay };
