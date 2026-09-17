-- Schema base de la prueba técnica de Aravia.
-- Se ejecuta automáticamente la primera vez que se crea el volumen de Postgres
-- (ver docker-entrypoint-initdb.d en docker-compose.yml).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- usado por crypt()/gen_salt() en el seed

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero_factura VARCHAR(30) NOT NULL,
  monto_total NUMERIC(14,2) NOT NULL CHECK (monto_total >= 0),
  saldo_pendiente NUMERIC(14,2) NOT NULL CHECK (saldo_pendiente >= 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'emitida'
    CHECK (estado IN ('emitida', 'pagada', 'anulada')),
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  concepto VARCHAR(255),
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_saldo_no_mayor_a_total CHECK (saldo_pendiente <= monto_total),
  CONSTRAINT uq_factura_numero_por_tenant UNIQUE (tenant_id, numero_factura)
);
CREATE INDEX idx_facturas_tenant_id ON facturas(tenant_id);
