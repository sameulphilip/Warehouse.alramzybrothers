const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const sql = require('mssql');

const root = __dirname;
const targetFile = path.join(root, 'data', 'db-target.json');
const backupRoot = '/var/lib/ramix-standby/backup';
const stripeCount = 8;
const windowsDir = 'C:\\Program Files (x86)\\Microsoft SQL Server\\MSSQL10_50.SQLEXPRESS2008\\MSSQL\\Backup';

function loadEnv(file) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function readMeta() {
  try {
    const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch (error) {
    return {};
  }
}

function writeMeta(patch) {
  const next = { target: 'primary', ...readMeta(), ...patch };
  if (next.target !== 'standby') next.target = 'primary';
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const temp = `${targetFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2));
  fs.renameSync(temp, targetFile);
}

function quote(value) {
  return `N'${String(value).replace(/'/g, "''")}'`;
}

function stripeName(index) {
  return `RamixNightly_${index}.bak`;
}

function windowsPath(index) {
  return `${windowsDir}\\${stripeName(index)}`;
}

function diskList(kind) {
  const items = [];
  for (let index = 0; index < stripeCount; index += 1) {
    const file = kind === 'windows' ? windowsPath(index) : `/var/opt/mssql/backup/${stripeName(index)}`;
    items.push(`DISK = ${quote(file)}`);
  }
  return items.join(', ');
}

function primaryConfig() {
  return {
    server: process.env.SQL_HOST,
    port: Number(process.env.SQL_PORT || 1433),
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: 'master',
    connectionTimeout: 20000,
    requestTimeout: 600000,
    pool: { max: 1, min: 0, idleTimeoutMillis: 1000 },
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
  };
}

function standbyConfig() {
  return {
    server: process.env.SQL_STANDBY_HOST || '127.0.0.1',
    port: Number(process.env.SQL_STANDBY_PORT || 14330),
    user: process.env.SQL_STANDBY_USER || 'sa',
    password: process.env.SQL_STANDBY_PASSWORD,
    database: 'master',
    connectionTimeout: 8000,
    requestTimeout: 600000,
    pool: { max: 1, min: 0, idleTimeoutMillis: 1000 },
    options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true }
  };
}

function exec(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function restoreStandby() {
  const pool = new sql.ConnectionPool(standbyConfig());
  await pool.connect();
  try {
    if (readMeta().target === 'standby') throw new Error('الموقع اتحوّل على النسخة الخارجية قبل اكتمال النسخ');
    const files = await pool.request().query(`RESTORE FILELISTONLY FROM ${diskList('linux')}`);
    const moves = files.recordset.map((row) => {
      const logical = row.LogicalName;
      const ext = String(row.Type).trim() === 'L' ? 'ldf' : 'mdf';
      return `MOVE ${quote(logical)} TO ${quote(`/var/opt/mssql/data/${logical}.${ext}`)}`;
    });
    if (!moves.length) throw new Error('ملف النسخة لا يحتوي ملفات قاعدة');
    await pool.request().query(`
      IF DB_ID(N'RamixDB') IS NOT NULL
      BEGIN
        ALTER DATABASE [RamixDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      END
    `);
    try {
      await pool.request().query(`
        RESTORE DATABASE [RamixDB] FROM ${diskList('linux')}
        WITH ${moves.join(', ')}, REPLACE, RECOVERY
      `);
    } catch (error) {
      try {
        await pool.request().query(`IF DB_ID(N'RamixDB') IS NOT NULL ALTER DATABASE [RamixDB] SET MULTI_USER`);
      } catch (resetError) { /* ignore */ }
      throw error;
    }
    await pool.request().query(`
      IF DB_ID(N'RamixDB') IS NOT NULL ALTER DATABASE [RamixDB] SET MULTI_USER;
    `);
  } finally {
    try { await pool.close(); } catch (error) { /* ignore */ }
  }
}

async function main() {
  loadEnv(path.join(root, '.env'));
  if (readMeta().target === 'standby') {
    console.log('SKIP website is using the standby copy');
    return;
  }
  if (!process.env.SQL_STANDBY_PASSWORD) throw new Error('standby password missing');
  fs.mkdirSync(backupRoot, { recursive: true });
  const primary = new sql.ConnectionPool(primaryConfig());
  await primary.connect();
  try {
    console.log('BACKUP start');
    await primary.request().query(`
      BACKUP DATABASE [RamixDB] TO ${diskList('windows')}
      WITH INIT, COPY_ONLY, NAME = N'Ramix nightly'
    `);
    for (let index = 0; index < stripeCount; index += 1) {
      console.log('READ', index + 1);
      const result = await primary.request().query(`
        SELECT BulkColumn AS chunk
        FROM OPENROWSET(BULK ${quote(windowsPath(index))}, SINGLE_BLOB) AS data
      `);
      const chunk = result.recordset[0] && result.recordset[0].chunk;
      if (!chunk || !chunk.length) throw new Error(`الشريحة ${index + 1} فاضية`);
      fs.writeFileSync(path.join(backupRoot, stripeName(index)), chunk);
      console.log('WROTE', index + 1, chunk.length);
    }
  } finally {
    try { await primary.close(); } catch (error) { /* ignore */ }
  }
  await exec('chown', ['-R', '10001:0', backupRoot]);
  console.log('RESTORE start');
  await restoreStandby();
  for (let index = 0; index < stripeCount; index += 1) {
    fs.rmSync(path.join(backupRoot, stripeName(index)), { force: true });
  }
  writeMeta({ lastCopyAt: new Date().toISOString(), lastCopyError: '' });
  console.log('COPY ok');
}

main().catch((error) => {
  console.error('COPY_FAIL', error.message);
  try { writeMeta({ lastCopyError: String(error.message || 'تعذر أخذ النسخة').slice(0, 180) }); } catch (writeError) { /* ignore */ }
  process.exit(1);
});
