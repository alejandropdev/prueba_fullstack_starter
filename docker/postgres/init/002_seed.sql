-- Datos de ejemplo para la prueba técnica de Aravia.
-- Password de todos los usuarios: password123 (ver README).

INSERT INTO tenants (name, slug) VALUES
  ('Comercializadora El Roble S.A.S', 'el-roble'),
  ('Textiles Andinos Ltda', 'textiles-andinos'),
  ('Soluciones Digitales Norte SAS', 'soluciones-norte');

INSERT INTO users (tenant_id, email, password_hash, full_name)
SELECT id, 'ana.gomez@elroble.test', crypt('password123', gen_salt('bf', 10)), 'Ana Gómez'
FROM tenants WHERE slug = 'el-roble'
UNION ALL
SELECT id, 'carlos.ruiz@elroble.test', crypt('password123', gen_salt('bf', 10)), 'Carlos Ruiz'
FROM tenants WHERE slug = 'el-roble'
UNION ALL
SELECT id, 'maria.lopez@textilesandinos.test', crypt('password123', gen_salt('bf', 10)), 'María López'
FROM tenants WHERE slug = 'textiles-andinos'
UNION ALL
SELECT id, 'juan.perez@solucionesnorte.test', crypt('password123', gen_salt('bf', 10)), 'Juan Pérez'
FROM tenants WHERE slug = 'soluciones-norte'
UNION ALL
SELECT id, 'laura.diaz@solucionesnorte.test', crypt('password123', gen_salt('bf', 10)), 'Laura Díaz'
FROM tenants WHERE slug = 'soluciones-norte';

-- El Roble: pendiente total, pagada, pendiente parcial (con centavos), anulada
INSERT INTO facturas (tenant_id, numero_factura, monto_total, saldo_pendiente, estado, concepto, fecha_emision)
SELECT id, 'FAC-EL-0001', 1500000.00, 1500000.00, 'emitida', 'Venta de mercancía - pedido 1023', '2025-08-01'::date FROM tenants WHERE slug = 'el-roble'
UNION ALL
SELECT id, 'FAC-EL-0002', 800000.00, 0.00, 'pagada', 'Servicio de mantenimiento', '2025-07-15'::date FROM tenants WHERE slug = 'el-roble'
UNION ALL
SELECT id, 'FAC-EL-0003', 2350750.50, 950750.50, 'emitida', 'Venta de mercancía - pedido 1050', '2025-08-20'::date FROM tenants WHERE slug = 'el-roble'
UNION ALL
SELECT id, 'FAC-EL-0004', 500000.00, 0.00, 'anulada', 'Factura anulada por error de digitación', '2025-06-10'::date FROM tenants WHERE slug = 'el-roble';

-- Textiles Andinos
INSERT INTO facturas (tenant_id, numero_factura, monto_total, saldo_pendiente, estado, concepto, fecha_emision)
SELECT id, 'FAC-TA-0001', 3200000.00, 3200000.00, 'emitida', 'Lote de telas - pedido 88', '2025-08-05'::date FROM tenants WHERE slug = 'textiles-andinos'
UNION ALL
SELECT id, 'FAC-TA-0002', 120000.00, 45000.75, 'emitida', 'Insumos varios', '2025-08-18'::date FROM tenants WHERE slug = 'textiles-andinos'
UNION ALL
SELECT id, 'FAC-TA-0003', 990000.00, 0.00, 'pagada', 'Confección lote 12', '2025-07-01'::date FROM tenants WHERE slug = 'textiles-andinos';

-- Soluciones Digitales Norte
INSERT INTO facturas (tenant_id, numero_factura, monto_total, saldo_pendiente, estado, concepto, fecha_emision)
SELECT id, 'FAC-SN-0001', 4750000.00, 4750000.00, 'emitida', 'Desarrollo de módulo a medida', '2025-08-10'::date FROM tenants WHERE slug = 'soluciones-norte'
UNION ALL
SELECT id, 'FAC-SN-0002', 275300.25, 275300.25, 'emitida', 'Licencias de software - agosto', '2025-08-22'::date FROM tenants WHERE slug = 'soluciones-norte'
UNION ALL
SELECT id, 'FAC-SN-0003', 60000.00, 0.00, 'pagada', 'Soporte técnico', '2025-07-28'::date FROM tenants WHERE slug = 'soluciones-norte'
UNION ALL
SELECT id, 'FAC-SN-0004', 1000000.00, 250000.00, 'emitida', 'Implementación fase 2 - cliente devolvió parte del alcance', '2025-08-25'::date FROM tenants WHERE slug = 'soluciones-norte';
