# Modulo `notas-credito`

Copia esta carpeta dentro de:

`src/modules/notas-credito/`

El modulo implementa:
- Crear nota de credito.
- Listar y consultar.
- Actualizar.
- DELETE como anulacion logica.
- Auditoria por nota y por factura.
- Ajuste transaccional del saldo.
- Bloqueo pesimista de la factura.
- Notificacion simulada por logger.

Despues debes registrar `NotasCreditoModule` en `src/app.module.ts` y las entidades en `src/database/data-source.ts`, y crear/ejecutar la migracion de las tablas.
