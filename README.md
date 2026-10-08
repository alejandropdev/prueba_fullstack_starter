# Starter — Prueba técnica Aravia

Esta es la base técnica ya funcionando: base de datos PostgreSQL, autenticación
JWT real y datos de ejemplo. El objetivo es que **no pierdas tiempo montando
infraestructura** y puedas dedicar tus ~90 minutos a diseñar e implementar la
solución al problema de negocio (anular/corregir facturas de forma segura).

## Requisitos previos

- Docker Desktop (o Docker Engine + Compose) corriendo.
- Node.js 20+ y npm.

## Setup (en orden)

```bash
docker compose up -d   # levanta Postgres con el schema y los datos de ejemplo ya cargados
npm install
npm run start:dev      # arranca la API en http://localhost:3000
```

El `.env` ya viene completo con valores de desarrollo, **no necesitas copiarlo
ni editarlo** (salvo que el puerto `5432` o `3000` ya estén ocupados en tu
máquina — en ese caso cambia `DB_PORT` / `APP_PORT` en `.env`).

Documentación interactiva de los endpoints (Swagger): http://localhost:3000/docs

## Credenciales de prueba

Password de **todos** los usuarios: `password123`

| Tenant                          | Email                              |
| -------------------------------- | ----------------------------------- |
| Comercializadora El Roble S.A.S  | ana.gomez@elroble.test              |
| Comercializadora El Roble S.A.S  | carlos.ruiz@elroble.test            |
| Textiles Andinos Ltda            | maria.lopez@textilesandinos.test    |
| Soluciones Digitales Norte SAS   | juan.perez@solucionesnorte.test     |
| Soluciones Digitales Norte SAS   | laura.diaz@solucionesnorte.test     |

## Probar el login y los endpoints

```bash
# 1. Login → devuelve un accessToken (JWT)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana.gomez@elroble.test","password":"password123"}'

# 2. Usa el token para consultar datos ya scopeados por tenant
TOKEN="pega_aqui_el_accessToken"

curl http://localhost:3000/tenants/me \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/facturas \
  -H "Authorization: Bearer $TOKEN"

curl "http://localhost:3000/facturas?estado=emitida" \
  -H "Authorization: Bearer $TOKEN"
```

Si repites el login con un usuario de otro tenant (ej. `maria.lopez@textilesandinos.test`)
verás que `GET /facturas` solo devuelve las facturas de su propio tenant, y que
pedir el `id` de una factura de otro tenant responde `404`.

## Qué trae esta base

- **Base de datos**: Postgres 16 en Docker, con 3 tenants, 5 usuarios y 11
  facturas de ejemplo (estados y saldos variados, incluyendo montos con
  centavos para que notes cualquier error de precisión).
- **Autenticación**: `POST /auth/login` con JWT real (no es un mock). Un guard
  (`JwtAuthGuard`) y un decorator (`@CurrentUser()`) ya listos para proteger
  cualquier endpoint nuevo que construyas.
- **Endpoints de solo lectura ya construidos**, como ejemplo del patrón de
  aislamiento por tenant que debes replicar: `GET /tenants/me`, `GET /facturas`,
  `GET /facturas/:id`.
- **Lo que falta por construir — y es justamente lo que evalúa la prueba**:
  cualquier funcionalidad para anular o corregir el valor de una factura ya
  emitida. No hay ningún endpoint, tabla ni migración relacionada: ese diseño
  es tu responsabilidad.

## Estructura del proyecto

```
prueba_fullstack_starter/
├── docker-compose.yml              # levanta solo Postgres
├── docker/postgres/init/           # schema + seed, se cargan automáticamente
├── .env                            # credenciales de desarrollo ya completas
├── src/
│   ├── main.ts / app.module.ts
│   ├── database/data-source.ts     # config TypeORM (CLI + app)
│   ├── common/                     # guard JWT, decorator @CurrentUser, utils de dinero
│   └── modules/
│       ├── auth/       (login, JWT strategy)
│       ├── users/      (usado internamente por auth)
│       ├── tenants/    (GET /tenants/me)
│       └── facturas/   (GET /facturas, GET /facturas/:id)
```

## Convenciones a seguir en tu solución

- **Columnas de base de datos en `snake_case`**, propiedades TypeScript en
  `camelCase` (mira cualquier entidad existente en `src/modules/*/entities`
  como referencia con `@Column({ name: '...' })`).
- **El dinero se maneja como `numeric`/`string`, nunca como `number`/`float`**.
  Usa `src/common/utils/money.util.ts` (basado en `decimal.js`) para sumar,
  restar o comparar montos sin errores de precisión.
- **Todo query de datos de negocio debe filtrar siempre por `tenantId`**
  (mira `facturas.service.ts` como referencia). Si un registro no pertenece al
  tenant del usuario autenticado, responde `404`, no `403`.
- Ya tienes migraciones de TypeORM configuradas y listas para usar en tu
  propia funcionalidad: `npm run migration:generate -- src/database/migrations/NombreMigracion`
  y `npm run migration:run`.

## Qué puedes tocar libremente vs. qué no conviene tocar

- **Libre**: todo lo que esté en `src/` — crea los módulos, entidades,
  migraciones y endpoints que necesites para tu solución.
- **No hace falta tocar** (ya está resuelto): `docker-compose.yml`,
  `docker/postgres/init/*` (el schema y seed base ya corrieron), ni el
  mecanismo de autenticación (`auth`, `common/guards`, `common/decorators`) —
  reutilízalo tal cual desde tus propios controllers.

## Troubleshooting

- **Puerto 5432 (o 3000) ya en uso**: cambia `DB_PORT` (o `APP_PORT`) en
  `.env` y vuelve a levantar Docker.
- **Necesitas resetear la base de datos desde cero** (por ejemplo si editaste
  algo en `docker/postgres/init`): los scripts de esa carpeta solo corren la
  primera vez que se crea el volumen de Postgres, así que hace falta borrarlo:
  ```bash
  npm run db:reset
  # equivale a: docker compose down -v && docker compose up -d
  ```

---

## Módulo de notas de crédito (solución)

Permite a soporte emitir, consultar, corregir y anular notas de crédito sobre una
factura sin modificar la base de datos manualmente.

### Cómo ejecutarlo

```bash
docker compose up -d
npm install
npm run start:dev      # aplica la migración de notas de crédito al arrancar
npm run test:e2e       # en otra terminal, con la API corriendo
```

### Endpoints

Todos requieren `Authorization: Bearer <token>`. El tenant y el usuario salen del token.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/facturas/:facturaId/notas-credito` | Emite una nota. Body: `{ "monto": "1500.50", "motivo": "..." }`. Header opcional `Idempotency-Key`. |
| `GET`  | `/facturas/:facturaId/notas-credito/historial` | Movimientos de saldo que las notas causaron en la factura. |
| `GET`  | `/notas-credito?facturaId=&estado=` | Lista las notas del tenant. |
| `GET`  | `/notas-credito/:id` | Detalle de una nota. |
| `GET`  | `/notas-credito/:id/historial` | Eventos de la nota en orden. |
| `POST` | `/notas-credito/:id/anular` | Anula la nota y restituye el saldo. Body: `{ "motivo": "..." }`. |
| `POST` | `/notas-credito/:id/corregir` | Anula la nota y emite otra enlazada, en una sola transacción. Body: `{ "monto", "motivo" }`. |

Respuestas de error: `400` monto o motivo inválido, `404` recurso inexistente o de
otro tenant, `409` conflicto de estado (factura no emitida, nota ya anulada,
`Idempotency-Key` reutilizada con otro contenido), `422` el monto excede el saldo.

### Cómo se cumplen las restricciones

- **Aislamiento por tenant**: toda consulta filtra por `tenant_id` del token, y la
  FK compuesta `(factura_id, tenant_id)` impide en la base de datos asociar una nota
  a una factura de otro tenant.
- **Precisión del dinero**: `NUMERIC(14,2)` en la base de datos, `string` en la API y
  `decimal.js` para operar. Un monto con más de 2 decimales se rechaza.
- **Saldo consistente**: cada operación es una transacción que primero bloquea la
  factura (`SELECT … FOR UPDATE`) y después valida. Las solicitudes simultáneas
  sobre una misma factura se ejecutan de una en una.
- **Trazabilidad**: cada movimiento inserta un evento en `nota_credito_eventos`
  (quién, cuándo, motivo, saldo y estado antes y después) dentro de la misma
  transacción. Un trigger rechaza `UPDATE` y `DELETE` sobre esa tabla.
- **Aviso al cliente final**: el aviso se inserta en `notificaciones_outbox` dentro
  de la transacción y se envía después del commit, con reintentos. El envío está
  detrás de la interfaz `NotificadorPort`; la implementación actual lo escribe en el
  log de la API (`AvisoClienteFinal`).

### Supuestos y alcance

- Solo se emiten notas sobre facturas `emitida` y por un monto menor o igual al
  saldo pendiente.
- Una nota emitida no se edita: corregir equivale a anular y emitir otra.
- Si el saldo llega a 0, la factura queda `anulada` cuando las notas vigentes cubren
  todo su valor y `pagada` en otro caso. Anular la nota la devuelve a `emitida`.
- Cualquier usuario autenticado del tenant actúa como soporte (no hay roles).
- Fuera de alcance: envío real por correo o SMS (la factura no tiene datos de
  contacto del cliente), roles y aprobaciones, notas sobre facturas pagadas,
  numeración fiscal y frontend.
