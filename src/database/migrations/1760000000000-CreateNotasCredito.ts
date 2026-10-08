import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotasCredito1760000000000 implements MigrationInterface {
  name = 'CreateNotasCredito1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notas_credito (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
        usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        numero VARCHAR(30) NOT NULL,
        monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
        motivo VARCHAR(500) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'anulada')),
        cliente_nombre VARCHAR(150) NOT NULL,
        cliente_email VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_nota_credito_numero_por_tenant UNIQUE (tenant_id, numero)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notas_credito_tenant_id ON notas_credito(tenant_id)`);
    await queryRunner.query(
      `CREATE INDEX idx_notas_credito_tenant_factura ON notas_credito(tenant_id, factura_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notas_credito_tenant_cliente ON notas_credito(tenant_id, cliente_email)`,
    );

    await queryRunner.query(`
      CREATE TABLE notas_credito_historial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nota_credito_id UUID NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
        factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
        usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        usuario_nombre VARCHAR(150) NOT NULL,
        usuario_email VARCHAR(150) NOT NULL,
        accion VARCHAR(20) NOT NULL CHECK (accion IN ('emitida', 'corregida', 'anulada')),
        monto_anterior NUMERIC(14,2) CHECK (monto_anterior IS NULL OR monto_anterior >= 0),
        monto_nuevo NUMERIC(14,2) CHECK (monto_nuevo IS NULL OR monto_nuevo >= 0),
        saldo_anterior NUMERIC(14,2) NOT NULL CHECK (saldo_anterior >= 0),
        saldo_nuevo NUMERIC(14,2) NOT NULL CHECK (saldo_nuevo >= 0),
        motivo_anterior VARCHAR(500),
        motivo VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_nc_historial_nota ON notas_credito_historial(nota_credito_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_nc_historial_tenant ON notas_credito_historial(tenant_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE notificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
        nota_credito_id UUID NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
        cliente_nombre VARCHAR(150) NOT NULL,
        cliente_email VARCHAR(150) NOT NULL,
        tipo VARCHAR(40) NOT NULL CHECK (
          tipo IN ('nota_credito_emitida', 'nota_credito_corregida', 'nota_credito_anulada')
        ),
        asunto VARCHAR(200) NOT NULL,
        mensaje TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_notificaciones_tenant_cliente ON notificaciones(tenant_id, cliente_email)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notificaciones_tenant_factura ON notificaciones(tenant_id, factura_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notificaciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS notas_credito_historial`);
    await queryRunner.query(`DROP TABLE IF EXISTS notas_credito`);
  }
}
