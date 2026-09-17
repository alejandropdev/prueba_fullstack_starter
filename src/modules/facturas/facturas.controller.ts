import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { FacturasService } from './facturas.service';
import { FindFacturasQueryDto } from './dto/find-facturas-query.dto';
import { Factura } from './entities/factura.entity';

@ApiTags('facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar facturas del tenant',
    description:
      'Solo devuelve facturas del tenant del usuario autenticado. Filtro opcional por estado.',
  })
  @ApiResponse({ status: 200, description: 'Facturas del tenant', type: [Factura] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindFacturasQueryDto) {
    return this.facturasService.findAllForTenant(user.tenantId, query.estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una factura del tenant' })
  @ApiResponse({ status: 200, description: 'Factura encontrada', type: Factura })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Factura no encontrada (incluso si pertenece a otro tenant)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturasService.findOneForTenant(id, user.tenantId);
  }
}
