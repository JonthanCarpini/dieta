/**
 * scraper-manager.js — Gerencia o processo do scrape-extra.js a partir do backend
 * Permite iniciar, parar e acompanhar o andamento pela API/painel.
 */
const { spawn } = require('child_process');
const path = require('path');

let proc      = null;     // ChildProcess em execução (ou null)
let startedAt = null;     // timestamp do início
let lastExit  = null;     // { code, at } do último encerramento
let lastOpts  = null;     // opções da última execução
let logLines  = [];       // ring buffer de saída
const MAX_LINES = 300;

function _push(line) {
  if (!line || !line.trim()) return;
  logLines.push(line);
  if (logLines.length > MAX_LINES) logLines.shift();
}

function start(opts = {}) {
  if (proc) return { ok: false, error: 'O importador já está em execução.' };

  const scriptPath = path.join(__dirname, 'scrape-extra.js');
  const args = [scriptPath];
  if (opts.max)   args.push('--max', String(parseInt(opts.max) || 100));
  if (opts.terms) args.push('--terms', String(opts.terms));
  if (opts.delay) args.push('--delay', String(parseInt(opts.delay) || 900));

  lastOpts  = opts;
  logLines  = [];
  startedAt = Date.now();
  lastExit  = null;

  // process.execPath = caminho absoluto do node atual (robusto dentro do container)
  proc = spawn(process.execPath, args, { cwd: path.join(__dirname, '..') });

  const onData = buf => String(buf).split(/\r?\n/).forEach(_push);
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);
  proc.on('error', err => { _push(`[erro ao iniciar] ${err.message}`); proc = null; startedAt = null; });
  proc.on('exit', code => {
    _push(`\n=== Processo encerrado (código ${code}) ===`);
    lastExit  = { code, at: Date.now() };
    proc      = null;
    startedAt = null;
  });

  return { ok: true };
}

function stop() {
  if (!proc) return { ok: false, error: 'Não há importação em execução.' };
  try { proc.kill('SIGTERM'); } catch {}
  const ref = proc;
  setTimeout(() => { if (ref && !ref.killed) { try { ref.kill('SIGKILL'); } catch {} } }, 2500);
  return { ok: true };
}

function status() {
  return {
    running: !!proc,
    startedAt,
    elapsedSec: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
    lastExit,
    lastOpts,
    lines: logLines.slice(-50),
  };
}

module.exports = { start, stop, status };
