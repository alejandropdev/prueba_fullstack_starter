import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearNotasCredito1759900000000 implements MigrationInterface {
  name = 'CrearNotasCredito1759900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Necesario para la FK compuesta: garantiza en BD que una nota de crédito
    // solo puede apuntar a una factura de su mismo tenant.
    await queryRunner.query(`
      ALTER TABLE facturas
        ADD CONSTRAINT uq_facturas_id_tenant UNIQUE (id, tenant_id)
    `);

    await queryRunner.query(`
      CREATE TABLE notas_credito (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        factura_id UUID NOT NULL,
        numero VARCHAR(30) NOT NULL,
        monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
        moneda CHAR(3) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'emitida'
          CHECK (estado IN ('emitida', 'anulada')),
        motivo VARCHAR(255) NOT NULL,
        reemplaza_a_id UUID REFERENCES notas_credito(id),
        idempotency_key VARCHAR(100),
        creada_por UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        anulada_por UUID REFERENCES users(id),
        anulada_at TIMESTAMPTZ,
        motivo_anulacion VARCHAR(255),
        CONSTRAINT fk_nc_factura_tenant FOREIGN KEY (factura_id, tenant_id)
          REFERENCES facturas(id, tenant_id),
        CONSTRAINT uq_nc_numero_por_tenant UNIQUE (tenant_id, numero),
        CONSTRAINT uq_nc_idempotency UNIQUE (tenant_id, idempotency_key),
        CONSTRAINT chk_nc_anulacion_completa
          CHECK ((estado = 'anulada') = (anulada_at IS NOT NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_nc_tenant_factura ON notas_credito(tenant_id, factura_id)`,
    );

    // Consecutivo de notas de crédito por tenant.
    await queryRunner.query(`
      CREATE TABLE nota_credito_consecutivos (
        tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        ultimo INTEGER NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE nota_credito_eventos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        secuencia BIGINT GENERATED ALWAYS AS IDENTITY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        nota_credito_id UUID NOT NULL REFERENCES notas_credito(id),
        factura_id UUID NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('EMITIDA', 'ANULADA')),
        actor_id UUID NOT NULL REFERENCES users(id),
        monto NUMERIC(14,2) NOT NULL,
        saldo_antes NUMERIC(14,2) NOT NULL,
        saldo_despues NUMERIC(14,2) NOT NULL,
        estado_factura_antes VARCHAR(20) NOT NULL,
        estado_factura_despues VARCHAR(20) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        ocurrido_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_nc_eventos_tenant_nota ON nota_credito_eventos(tenant_id, nota_credito_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_nc_eventos_tenant_factura ON nota_credito_eventos(tenant_id, factura_id)`,
    );

    // Trazabilidad append-only: la historia no se puede reescribir ni borrar.
    await queryRunner.query(`
      CREATE FUNCTION nota_credito_eventos_inmutable() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'nota_credito_eventos es de solo inserción';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_nota_credito_eventos_inmutable
        BEFORE UPDATE OR DELETE ON nota_credito_eventos
        FOR EACH ROW EXECUTE FUNCTION nota_credito_eventos_inmutable()
    `);

    await queryRunner.query(`
      CREATE TABLE notificaciones_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        evento_id UUID NOT NULL UNIQUE REFERENCES nota_credito_eventos(id),
        tipo VARCHAR(40) NOT NULL
          CHECK (tipo IN ('NOTA_CREDITO_EMITIDA', 'NOTA_CREDITO_ANULADA')),
        payload JSONB NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
          CHECK (estado IN ('pendiente', 'enviada', 'fallida')),
        intentos INTEGER NOT NULL DEFAULT 0,
        proximo_intento_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ultimo_error TEXT,
        enviada_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_outbox_pendientes ON notificaciones_outbox(proximo_intento_at)
        WHERE estado = 'pendiente'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notificaciones_outbox`);
    await queryRunner.query(`DROP TABLE nota_credito_eventos`);
    await queryRunner.query(`DROP FUNCTION nota_credito_eventos_inmutable()`);
    await queryRunner.query(`DROP TABLE nota_credito_consecutivos`);
    await queryRunner.query(`DROP TABLE notas_credito`);
    await queryRunner.query(`ALTER TABLE facturas DROP CONSTRAINT uq_facturas_id_tenant`);
  }
}
