function escapeName(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renameParams(text, inputs, suffix) {
  let out = text;
  for (const item of inputs) {
    out = out.replace(new RegExp(`(^|[^@])@${escapeName(item.name)}(?![A-Za-z0-9_])`, 'g'), `$1@${item.name}${suffix}`);
  }
  return { text: out, inputs: inputs.map((item) => ({ ...item, name: `${item.name}${suffix}` })) };
}

// Queued statements travel in the same request as the next query; NOCOUNT keeps the
// query's rowsAffected and first recordset its own.
function combineBatch(pending, main) {
  if (!pending.length) return { text: main.text, inputs: main.inputs };
  const parts = ['SET NOCOUNT ON'];
  const inputs = [];
  pending.forEach((statement, index) => {
    const renamed = renameParams(statement.text, statement.inputs, `__q${index}`);
    parts.push(renamed.text.trim().replace(/;+$/, ''));
    inputs.push(...renamed.inputs);
  });
  parts.push('SET NOCOUNT OFF', main.text);
  return { text: parts.join(';\n'), inputs: inputs.concat(main.inputs) };
}

module.exports = { combineBatch };
