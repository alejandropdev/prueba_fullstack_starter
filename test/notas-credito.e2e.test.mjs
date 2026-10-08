// Pruebas end-to-end del módulo de notas de crédito contra la API y Postgres reales.
// Requisitos: `docker compose up -d` y `npm run start:dev` corriendo. Ejecutar: `npm run test:e2e`.
// Cada prueba anula las notas que emite, así que se pueden repetir sin resetear la BD.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';
import Decimal from 'decimal.js';

const API = process.env.API_URL ?? `http://localhost:${process.env.APP_PORT ?? 3000}`;
const PASSWORD = 'password123';

const db = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

let ana; // El Roble
let maria; // Textiles Andinos
let juan; // Soluciones Norte

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.ok(res.ok, `login ${email} respondió ${res.status}`);
  return (await res.json()).accessToken;
}

async function api(token, method, path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function facturaPorNumero(token, numero) {
  const { body } = await api(token, 'GET', '/facturas');
  const factura = body.find((f) => f.numeroFactura === numero);
  assert.ok(factura, `no existe la factura ${numero}`);
  return factura;
}

const emitir = (token, facturaId, monto, motivo = 'Prueba e2e', headers) =>
  api(token, 'POST', `/facturas/${facturaId}/notas-credito`, { monto, motivo }, headers);
const anular = (token, notaId, motivo = 'Limpieza prueba e2e') =>
  api(token, 'POST', `/notas-credito/${notaId}/anular`, { motivo });

before(async () => {
  await db.connect();
  [ana, maria, juan] = await Promise.all([
    login('ana.gomez@elroble.test'),
    login('maria.lopez@textilesandinos.test'),
    login('juan.perez@solucionesnorte.test'),
  ]);
});

after(() => db.end());

test('emitir descuenta el saldo al centavo y anular lo restituye', async () => {
  const antes = await facturaPorNumero(ana, 'FAC-EL-0003');

  const emitida = await emitir(ana, antes.id, '0.50');
  assert.equal(emitida.status, 201);
  assert.equal(emitida.body.notaCredito.monto, '0.50');
  assert.equal(emitida.body.notaCredito.moneda, antes.moneda);
  assert.equal(
    emitida.body.factura.saldoPendiente,
    new Decimal(antes.saldoPendiente).minus('0.50').toFixed(2),
  );

  const anulada = await anular(ana, emitida.body.notaCredito.id);
  assert.equal(anulada.status, 200);
  assert.equal(anulada.body.notaCredito.estado, 'anulada');
  assert.equal(anulada.body.factura.saldoPendiente, antes.saldoPendiente);

  const historial = await api(
    ana,
    'GET',
    `/notas-credito/${emitida.body.notaCredito.id}/historial`,
  );
  assert.deepEqual(
    historial.body.map((e) => [e.tipo, e.saldoAntes, e.saldoDespues]),
    [
      ['EMITIDA', antes.saldoPendiente, emitida.body.factura.saldoPendiente],
      ['ANULADA', emitida.body.factura.saldoPendiente, antes.saldoPendiente],
    ],
  );
});

test('rechaza un monto que excede el saldo por un centavo y no cambia nada', async () => {
  const antes = await facturaPorNumero(ana, 'FAC-EL-0003');
  const exceso = new Decimal(antes.saldoPendiente).plus('0.01').toFixed(2);

  const res = await emitir(ana, antes.id, exceso);
  assert.equal(res.status, 422);
  assert.equal((await facturaPorNumero(ana, 'FAC-EL-0003')).saldoPendiente, antes.saldoPendiente);
});

test('rechaza montos mal formados', async () => {
  const { id } = await facturaPorNumero(ana, 'FAC-EL-0003');
  for (const monto of [100.5, '10.555', '-5', '0', '0.00', 'abc', '']) {
    const res = await emitir(ana, id, monto);
    assert.equal(res.status, 400, `monto ${JSON.stringify(monto)} debería ser 400`);
  }
});

test('no emite sobre facturas pagadas o anuladas', async () => {
  for (const numero of ['FAC-EL-0002', 'FAC-EL-0004']) {
    const { id } = await facturaPorNumero(ana, numero);
    assert.equal((await emitir(ana, id, '1.00')).status, 409);
  }
});

test('solicitudes simultáneas nunca descuentan más que el saldo', async () => {
  const antes = await facturaPorNumero(ana, 'FAC-EL-0003'); // saldo 950750.50
  // 12 notas de 100000.00 a la vez: solo caben 9.
  const respuestas = await Promise.all(
    Array.from({ length: 12 }, () => emitir(ana, antes.id, '100000.00')),
  );
  const creadas = respuestas.filter((r) => r.status === 201);
  const rechazadas = respuestas.filter((r) => r.status === 422);
  assert.equal(creadas.length, 9);
  assert.equal(rechazadas.length, 3);

  const durante = await facturaPorNumero(ana, 'FAC-EL-0003');
  assert.equal(durante.saldoPendiente, new Decimal(antes.saldoPendiente).minus(900000).toFixed(2));

  const numeros = new Set(creadas.map((r) => r.body.notaCredito.numero));
  assert.equal(numeros.size, 9, 'los consecutivos no se repiten');

  // Cada nota se anula dos veces a la vez: una gana (200), la otra recibe 409.
  const anulaciones = await Promise.all(
    creadas.flatMap((r) => [
      anular(ana, r.body.notaCredito.id),
      anular(ana, r.body.notaCredito.id),
    ]),
  );
  assert.equal(anulaciones.filter((r) => r.status === 200).length, 9);
  assert.equal(anulaciones.filter((r) => r.status === 409).length, 9);
  assert.equal((await facturaPorNumero(ana, 'FAC-EL-0003')).saldoPendiente, antes.saldoPendiente);
});

test('un tenant no puede ver ni afectar notas o facturas de otro', async () => {
  const facturaRoble = await facturaPorNumero(ana, 'FAC-EL-0001');
  const { body } = await emitir(ana, facturaRoble.id, '10.00');
  const notaId = body.notaCredito.id;

  assert.equal((await emitir(maria, facturaRoble.id, '10.00')).status, 404);
  assert.equal((await api(maria, 'GET', `/notas-credito/${notaId}`)).status, 404);
  assert.equal((await api(maria, 'GET', `/notas-credito/${notaId}/historial`)).status, 404);
  assert.equal(
    (await api(maria, 'GET', `/facturas/${facturaRoble.id}/notas-credito/historial`)).status,
    404,
  );
  assert.equal((await anular(maria, notaId)).status, 404);
  assert.equal(
    (await api(maria, 'POST', `/notas-credito/${notaId}/corregir`, { monto: '1.00', motivo: 'x' }))
      .status,
    404,
  );
  const listaMaria = await api(maria, 'GET', '/notas-credito');
  assert.ok(listaMaria.body.every((n) => n.id !== notaId));

  // Nada de lo anterior afectó la nota ni el saldo.
  assert.equal((await api(ana, 'GET', `/notas-credito/${notaId}`)).body.estado, 'emitida');
  assert.equal(
    (await anular(ana, notaId)).body.factura.saldoPendiente,
    facturaRoble.saldoPendiente,
  );
});

test('Idempotency-Key: el reintento devuelve la misma nota y descuenta una sola vez', async () => {
  const antes = await facturaPorNumero(ana, 'FAC-EL-0001');
  const headers = { 'Idempotency-Key': randomUUID() };

  const [a, b] = await Promise.all([
    emitir(ana, antes.id, '250.25', 'Reintento', headers),
    emitir(ana, antes.id, '250.25', 'Reintento', headers),
  ]);
  const c = await emitir(ana, antes.id, '250.25', 'Reintento', headers);
  assert.deepEqual([a.status, b.status, c.status], [201, 201, 201]);
  assert.equal(a.body.notaCredito.id, b.body.notaCredito.id);
  assert.equal(a.body.notaCredito.id, c.body.notaCredito.id);
  assert.equal(
    (await facturaPorNumero(ana, 'FAC-EL-0001')).saldoPendiente,
    new Decimal(antes.saldoPendiente).minus('250.25').toFixed(2),
  );

  assert.equal((await emitir(ana, antes.id, '999.00', 'Otro contenido', headers)).status, 409);

  await anular(ana, a.body.notaCredito.id);
  assert.equal((await facturaPorNumero(ana, 'FAC-EL-0001')).saldoPendiente, antes.saldoPendiente);
});

test('corregir anula la original y emite una nueva enlazada, en un solo paso', async () => {
  const antes = await facturaPorNumero(maria, 'FAC-TA-0002'); // saldo 45000.75
  const original = (await emitir(maria, antes.id, '1000.00')).body.notaCredito;

  const corregida = await api(maria, 'POST', `/notas-credito/${original.id}/corregir`, {
    monto: '400.25',
    motivo: 'Valor correcto',
  });
  assert.equal(corregida.status, 201);
  assert.equal(corregida.body.notaAnulada.estado, 'anulada');
  assert.equal(corregida.body.notaCredito.reemplazaAId, original.id);
  assert.equal(
    corregida.body.factura.saldoPendiente,
    new Decimal(antes.saldoPendiente).minus('400.25').toFixed(2),
  );

  // Una corrección que excede el saldo no deja ni la anulación ni la emisión.
  const nuevaId = corregida.body.notaCredito.id;
  const excesiva = await api(maria, 'POST', `/notas-credito/${nuevaId}/corregir`, {
    monto: '45000.76',
    motivo: 'Excede',
  });
  assert.equal(excesiva.status, 422);
  assert.equal((await api(maria, 'GET', `/notas-credito/${nuevaId}`)).body.estado, 'emitida');

  // La original ya está anulada: no se puede corregir ni anular otra vez.
  assert.equal((await anular(maria, original.id)).status, 409);

  const historial = await api(maria, 'GET', `/facturas/${antes.id}/notas-credito/historial`);
  const ultimos = historial.body.slice(-3).map((e) => e.tipo);
  assert.deepEqual(ultimos, ['EMITIDA', 'ANULADA', 'EMITIDA']);

  await anular(maria, nuevaId);
  assert.equal((await facturaPorNumero(maria, 'FAC-TA-0002')).saldoPendiente, antes.saldoPendiente);
});

test('una nota por el total anula la factura; anular la nota la reabre', async () => {
  const antes = await facturaPorNumero(juan, 'FAC-SN-0002'); // total = saldo = 275300.25
  const emitida = await emitir(juan, antes.id, antes.saldoPendiente);
  assert.equal(emitida.body.factura.saldoPendiente, '0.00');
  assert.equal(emitida.body.factura.estado, 'anulada');

  const anulada = await anular(juan, emitida.body.notaCredito.id);
  assert.equal(anulada.body.factura.saldoPendiente, antes.saldoPendiente);
  assert.equal(anulada.body.factura.estado, 'emitida');
});

test('cada movimiento deja evento inmutable y un aviso que se envía tras el commit', async () => {
  const { id } = await facturaPorNumero(juan, 'FAC-SN-0001');
  const nota = (await emitir(juan, id, '75.10')).body.notaCredito;
  await anular(juan, nota.id);

  const eventos = await db.query(
    'SELECT id, tipo FROM nota_credito_eventos WHERE nota_credito_id = $1 ORDER BY secuencia',
    [nota.id],
  );
  assert.deepEqual(
    eventos.rows.map((e) => e.tipo),
    ['EMITIDA', 'ANULADA'],
  );

  await assert.rejects(
    db.query(`UPDATE nota_credito_eventos SET monto = 1 WHERE id = $1`, [eventos.rows[0].id]),
    /solo inserción/,
  );
  await assert.rejects(
    db.query(`DELETE FROM nota_credito_eventos WHERE id = $1`, [eventos.rows[0].id]),
    /solo inserción/,
  );

  // El despacho es asíncrono: se espera hasta 5 s a que ambos avisos salgan.
  let avisos;
  for (let i = 0; i < 25; i++) {
    avisos = await db.query(
      `SELECT tipo, estado FROM notificaciones_outbox
        WHERE evento_id = ANY($1::uuid[]) ORDER BY created_at`,
      [eventos.rows.map((e) => e.id)],
    );
    if (avisos.rows.length === 2 && avisos.rows.every((a) => a.estado === 'enviada')) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.deepEqual(avisos.rows.map((a) => [a.tipo, a.estado]).sort(), [
    ['NOTA_CREDITO_ANULADA', 'enviada'],
    ['NOTA_CREDITO_EMITIDA', 'enviada'],
  ]);
});

test('la base de datos impide una nota apuntando a una factura de otro tenant', async () => {
  const facturaRoble = await facturaPorNumero(ana, 'FAC-EL-0001');
  await assert.rejects(
    db.query(
      `INSERT INTO notas_credito (tenant_id, factura_id, numero, monto, moneda, motivo, creada_por)
       SELECT u.tenant_id, $1, 'NC-INTRUSA', 1, 'COP', 'cruce de tenant', u.id
         FROM users u WHERE u.email = 'maria.lopez@textilesandinos.test'`,
      [facturaRoble.id],
    ),
    /fk_nc_factura_tenant/,
  );
});
