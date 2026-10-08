import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { FacturasService } from './facturas.service';
import { FindFacturasQueryDto } from './dto/find-facturas-query.dto';

@ApiBearerAuth()
@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindFacturasQueryDto) {
    return this.facturasService.findAllForTenant(user.tenantId, query.estado);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facturasService.findOneForTenant(id, user.tenantId);
  }
}
