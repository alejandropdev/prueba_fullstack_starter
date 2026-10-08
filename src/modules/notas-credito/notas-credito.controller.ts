import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import {
  AnularNotaCreditoDto,
  CorregirNotaCreditoDto,
  CrearNotaCreditoDto,
  FindNotasCreditoQueryDto,
} from './dto/nota-credito.dto';
import { NotasCreditoService } from './notas-credito.service';

// El tenant y el usuario salen siempre del JWT (@CurrentUser), nunca del body
// ni de la URL.
@ApiTags('notas-credito')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post('facturas/:facturaId/notas-credito')
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Opcional. Identificador único de la solicitud: un reintento con el mismo valor no descuenta dos veces.',
  })
  emitir(
    @Param('facturaId', ParseUUIDPipe) facturaId: string,
    @Body() dto: CrearNotaCreditoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.notasCreditoService.emitir(user, facturaId, dto, idempotencyKey);
  }

  @Get('facturas/:facturaId/notas-credito/historial')
  historialDeFactura(
    @Param('facturaId', ParseUUIDPipe) facturaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notasCreditoService.historialDeFactura(facturaId, user.tenantId);
  }

  @Get('notas-credito')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindNotasCreditoQueryDto) {
    return this.notasCreditoService.findAllForTenant(user.tenantId, query);
  }

  @Get('notas-credito/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notasCreditoService.findOneForTenant(id, user.tenantId);
  }

  @Get('notas-credito/:id/historial')
  historial(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notasCreditoService.historialDeNota(id, user.tenantId);
  }

  @Post('notas-credito/:id/anular')
  @HttpCode(200)
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularNotaCreditoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notasCreditoService.anular(user, id, dto);
  }

  @Post('notas-credito/:id/corregir')
  corregir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorregirNotaCreditoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notasCreditoService.corregir(user, id, dto);
  }
}
