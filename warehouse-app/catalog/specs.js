const MAX_LINES = 40;
const MAX_LABEL = 40;
const MAX_VALUE = 120;

// One line per fact, "LABEL: value". Lines sharing a label are grouped like OEM cross-references in parts catalogs.
function parseSpecs(text) {
  const groups = [];
  const byLabel = new Map();
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([^:：]{1,80})[:：]\s*(.*)$/);
    const label = match ? match[1].trim().slice(0, MAX_LABEL) : '';
    const value = (match ? match[2] : line).trim().slice(0, MAX_VALUE);
    if (!value) continue;
    let group = byLabel.get(label);
    if (!group) {
      if (groups.length >= MAX_LINES) continue;
      group = { label, values: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    group.values.push(value);
  }
  return groups;
}

module.exports = { parseSpecs };
