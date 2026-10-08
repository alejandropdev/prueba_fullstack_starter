# Prompt para generar el frontend (v0 u otra IA)

Copia todo lo que está dentro del bloque.

```text
Genera el frontend de un módulo de NOTAS DE CRÉDITO sobre facturas para una
aplicación SaaS multi-tenant. El backend ya existe (NestJS + PostgreSQL + JWT);
tú solo construyes la interfaz que consume su API REST.

========================================================================
1. STACK Y RESTRICCIONES (OBLIGATORIAS)
========================================================================
- Next.js (App Router) + React + TypeScript.
- Estilos SOLO con Tailwind CSS.
- PROHIBIDO usar librerías externas: nada de shadcn/ui, Radix, Headless UI,
  MUI, lucide-react, heroicons, react-icons, axios, react-query, SWR, zod,
  react-hook-form, date-fns, decimal.js, ni librerías de toasts o modales.
- Las únicas dependencias permitidas son next, react, react-dom, typescript
  y tailwindcss (con su configuración).
- Íconos como SVG inline. Modales, toasts, tablas, badges y spinners hechos a
  mano con Tailwind.
- Peticiones HTTP con fetch nativo, centralizadas en un cliente en lib/api.ts.
- Interfaz en español. Fechas y moneda en formato es-CO.

========================================================================
2. CONTEXTO DE NEGOCIO
========================================================================
- Cada empresa es un TENANT. Un usuario pertenece a un solo tenant y solo ve
  datos de su tenant.
- Una FACTURA tiene monto_total (no cambia) y saldo_pendiente (lo que falta
  por cobrar).
- Una NOTA DE CRÉDITO reduce el saldo pendiente de una factura (devolución,
  descuento, error de facturación).
- Las notas NO se editan ni se eliminan: se ANULAN, y al anularse el monto
  vuelve al saldo de la factura.
- Cada cambio de saldo queda registrado como un MOVIMIENTO (histórico).
- Por eso el "CRUD" es: Crear, Listar, Ver detalle y Anular. No construyas
  botones de editar ni eliminar notas, ni de editar facturas.

========================================================================
3. AUTENTICACIÓN Y TENANT
========================================================================
- Login con email y password → el backend devuelve un JWT.
- Guarda el token en sessionStorage y envíalo en cada request como
  Authorization: Bearer <token>.
- El tenant viene DENTRO del token. NUNCA envíes tenantId en el body, query
  ni headers de ninguna petición.
- Si cualquier respuesta es 401 → borra el token y redirige a /login.
- Rutas privadas: si no hay token, redirige a /login.
- En el header muestra el nombre del tenant (GET /tenants/me), el email del
  usuario y un botón "Cerrar sesión".

========================================================================
4. API (base URL en NEXT_PUBLIC_API_URL, por defecto http://localhost:3000)
========================================================================
Todos los montos llegan y se envían como STRING con 2 decimales
(ej. "950750.50"). Todas las respuestas usan camelCase.

-- Ya existentes --
POST /auth/login
  body: { "email": string, "password": string }
  200:  { "accessToken": string,
          "user": { "id", "email", "fullName", "tenantId" } }
  401:  credenciales inválidas

GET /tenants/me
  200: { "id", "name", "slug", "createdAt", "updatedAt" }

GET /facturas?estado=emitida|pagada|anulada   (estado opcional)
GET /facturas/:id
  Factura = {
    "id": uuid, "tenantId": uuid, "numeroFactura": "FAC-EL-0003",
    "montoTotal": "2350750.50", "saldoPendiente": "950750.50",
    "estado": "emitida" | "pagada" | "anulada", "moneda": "COP",
    "concepto": string | null, "fechaEmision": "2025-08-20",
    "createdAt": iso, "updatedAt": iso
  }

-- Nuevos (módulo de notas de crédito) --
POST /facturas/:facturaId/notas-credito
  headers: Idempotency-Key: <uuid>
  body: { "monto": "150000.25", "motivo": string, "descripcion"?: string }
  201: NotaCredito + { "saldoAnterior": string, "saldoPosterior": string }
  200: la misma nota (reintento con la misma Idempotency-Key)

GET /notas-credito?estado=emitida|anulada&facturaId=uuid&page=1&limit=20
  200: { "data": NotaCredito[], "total": number, "page": number, "limit": number }

GET /notas-credito/:id
  200: NotaCredito

GET /facturas/:facturaId/notas-credito
  200: NotaCredito[]

GET /facturas/:facturaId/movimientos
  200: Movimiento[]   (ordenados del más antiguo al más reciente)

POST /notas-credito/:id/anular
  body: { "motivo": string }
  200: NotaCredito (estado "anulada")

NotaCredito = {
  "id": uuid, "facturaId": uuid, "numeroNota": "NC-000001",
  "monto": "150000.25", "motivo": string, "descripcion": string | null,
  "estado": "emitida" | "anulada", "createdBy": uuid,
  "createdAt": iso, "updatedAt": iso,
  "ipAddress": string | null, "requestId": uuid | null
}

Movimiento = {
  "id": uuid, "facturaId": uuid, "notaCreditoId": uuid | null,
  "tipo": "emision" | "pago" | "nota_credito" | "anulacion_nota_credito" | "ajuste",
  "monto": string, "saldoAnterior": string, "saldoPosterior": string,
  "descripcion": string | null, "createdBy": uuid, "createdAt": iso,
  "ipAddress": string | null, "userAgent": string | null,
  "requestId": uuid | null, "correlationId": uuid | null
}

Errores: { "statusCode": number, "message": string | string[] }
  400 datos inválidos · 401 sesión expirada · 404 no encontrado
  409 conflicto (factura anulada, nota ya anulada, operación en curso)
  422 el monto supera el saldo pendiente

Envía en cada request un header X-Correlation-Id con un UUID
(crypto.randomUUID()) para trazabilidad.

========================================================================
5. MANEJO DEL DINERO (CRÍTICO: NO SE PUEDE PERDER NI UN CENTAVO)
========================================================================
- NUNCA conviertas montos a number: prohibido parseFloat, Number(), "+monto"
  y operaciones aritméticas con decimales de JS.
- Crea lib/money.ts con utilidades propias basadas en BigInt y centavos:
    toCents(value: string): bigint       // "1500.25" → 150025n
    fromCents(cents: bigint): string     // 150025n → "1500.25"
    compareMoney(a: string, b: string): -1 | 0 | 1
    subtractMoney(a: string, b: string): string
    formatMoney(value: string, moneda: string): string
      // "2350750.50","COP" → "$ 2.350.750,50" formateando la parte entera y
      // decimal como texto, SIN pasar por number.
    isValidMoneyInput(value: string): boolean
      // regex ^\d{1,12}(\.\d{1,2})?$ y mayor que cero
- El input de monto es type="text" con inputMode="decimal". Acepta coma o
  punto como separador decimal y normaliza a punto antes de enviar.
  Rechaza más de 2 decimales (no redondees).
- La vista previa del saldo resultante se calcula con BigInt.

========================================================================
6. PANTALLAS
========================================================================
6.1 /login
  - Formulario email + password, botón con estado de carga, mensaje de error
    genérico "Credenciales inválidas".

6.2 /facturas (inicio después del login)
  - Tabla: número, concepto, fecha de emisión, monto total, saldo pendiente,
    estado (badge de color), acciones ("Ver detalle").
  - Filtro por estado (tabs: Todas, Emitidas, Pagadas, Anuladas).
  - Búsqueda local por número o concepto.
  - Tarjetas resumen arriba: cantidad de facturas emitidas y suma del saldo
    pendiente (sumado con BigInt).
  - Estados vacíos y de carga (skeleton).

6.3 /facturas/[id]
  - Encabezado: número, estado, concepto, fecha, monto total, saldo pendiente
    y una barra de progreso de saldo pendiente vs total (porcentaje calculado
    con BigInt).
  - Botón "Crear nota de crédito": visible solo si estado != "anulada" y
    saldo > 0.
  - Pestaña "Notas de crédito": tabla con número, fecha, monto, motivo,
    estado y botón "Anular" (solo si estado "emitida").
  - Pestaña "Historial de movimientos": línea de tiempo vertical; cada evento
    muestra tipo (con ícono y color), monto con signo (- para nota_credito y
    pago, + para anulacion_nota_credito), saldo anterior → saldo posterior,
    fecha y hora, descripción y un bloque expandible "Trazabilidad" con
    usuario, IP, user agent, request id y correlation id.

6.4 Modal "Crear nota de crédito"
  - Muestra la factura y su saldo pendiente actual.
  - Campos: monto (requerido), motivo (select: Devolución, Descuento, Error
    de facturación, Otro; requerido), descripción (textarea opcional, máx.
    500 caracteres).
  - Botón "Usar saldo total" que llena el monto con el saldo pendiente.
  - Vista previa en vivo: "Saldo actual → Saldo resultante".
  - Validación en cliente: formato, > 0 y <= saldo pendiente.
  - Paso de confirmación antes de enviar: "Se creará una nota por $X. El
    saldo pasará de $A a $B. Esta acción no se puede editar."
  - IDEMPOTENCIA: genera crypto.randomUUID() como Idempotency-Key al abrir
    el modal. Si la petición falla por red o timeout y el usuario reintenta,
    REUTILIZA la misma key. Solo genera una nueva al abrir el modal otra vez
    después de un éxito o al cambiar el monto.
  - Mientras se envía: deshabilita el botón y los campos (evita doble clic).
  - Al terminar: cierra el modal, muestra toast de éxito con el número de
    nota y recarga factura, notas y movimientos desde el servidor (no
    actualices el saldo localmente).
  - Errores: 422 → "El monto supera el saldo pendiente actual" y recarga la
    factura (otro usuario pudo cambiarla); 409 → mensaje del backend;
    404 → "La factura no existe" y volver al listado.

6.5 Modal "Anular nota de crédito"
  - Muestra número, monto y fecha de la nota.
  - Campo motivo de anulación (requerido, máx. 500).
  - Advertencia: "El monto de $X volverá al saldo de la factura. La nota
    quedará anulada de forma permanente."
  - Botón rojo de confirmación, deshabilitado mientras se envía.
  - Al terminar: toast y recarga de datos desde el servidor.

6.6 /notas-credito
  - Tabla paginada de todas las notas del tenant: número, factura (link),
    fecha, monto, motivo, estado.
  - Filtros: estado y búsqueda por número.
  - Paginación con anterior / siguiente y total.

6.7 /notas-credito/[id]
  - Detalle completo de la nota, link a su factura, datos de trazabilidad y
    botón "Anular" si está emitida.

========================================================================
7. DISEÑO Y UX
========================================================================
- Layout con sidebar (Facturas, Notas de crédito) y header con tenant y
  usuario. En móvil el sidebar se convierte en menú desplegable.
- Estilo sobrio de aplicación financiera: fondo gris muy claro, tarjetas
  blancas, bordes suaves, tipografía del sistema.
- Montos alineados a la derecha con tabular-nums.
- Badges de estado:
    factura emitida = azul, pagada = verde, anulada = gris
    nota emitida = verde, anulada = rojo tachado
- Toasts propios (esquina superior derecha, desaparecen a los 4 s).
- Accesibilidad: labels en todos los inputs, foco visible, modales con
  role="dialog", aria-modal, cierre con Escape y foco atrapado dentro.
- Responsive: las tablas hacen scroll horizontal en pantallas pequeñas.

========================================================================
8. ESTRUCTURA SUGERIDA
========================================================================
app/
  login/page.tsx
  (app)/layout.tsx              // sidebar + header + protección de ruta
  (app)/facturas/page.tsx
  (app)/facturas/[id]/page.tsx
  (app)/notas-credito/page.tsx
  (app)/notas-credito/[id]/page.tsx
components/
  ui/ (Button, Badge, Modal, Toast, Table, Spinner, Tabs, Icons)
  facturas/ (FacturasTable, FacturaHeader, MovimientosTimeline)
  notas/ (CrearNotaModal, AnularNotaModal, NotasTable)
lib/
  api.ts       // fetch + token + X-Correlation-Id + manejo de 401
  auth.ts      // guardar/leer/borrar token
  money.ts     // utilidades con BigInt
  types.ts     // Factura, NotaCredito, Movimiento, Tenant

========================================================================
9. MODO MOCK
========================================================================
Los endpoints de notas de crédito todavía se están construyendo. Si
NEXT_PUBLIC_USE_MOCKS=true, lib/api.ts debe responder con datos en memoria
que simulen el comportamiento real (incluidos 404, 409, 422 e idempotencia),
usando estos datos de ejemplo:

Tenant "Comercializadora El Roble S.A.S" (usuario ana.gomez@elroble.test,
password password123):
  FAC-EL-0001  total 1500000.00  saldo 1500000.00  emitida
  FAC-EL-0002  total  800000.00  saldo       0.00  pagada
  FAC-EL-0003  total 2350750.50  saldo  950750.50  emitida
  FAC-EL-0004  total  500000.00  saldo       0.00  anulada

Tenant "Textiles Andinos Ltda" (maria.lopez@textilesandinos.test):
  FAC-TA-0001  total 3200000.00  saldo 3200000.00  emitida
  FAC-TA-0002  total  120000.00  saldo   45000.75  emitida
  FAC-TA-0003  total  990000.00  saldo       0.00  pagada

Cada factura arranca con un movimiento "emision" cuyo saldo posterior es su
saldo actual. En modo mock, cada usuario solo debe ver las facturas de su
tenant.
```
