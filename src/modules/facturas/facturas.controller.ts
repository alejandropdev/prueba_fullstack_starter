import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { FacturasService } from './facturas.service';
import { FindFacturasQueryDto } from './dto/find-facturas-query.dto';

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindFacturasQueryDto) {
    return this.facturasService.findAllForTenant(user.tenantId, query.estado);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturasService.findOneForTenant(id, user.tenantId);
  }
}
