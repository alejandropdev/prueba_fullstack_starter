import { Controller, Put, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface';
import { AnularService } from './anular.service';

@ApiTags('facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facturas')
export class AnularController {
  constructor(private readonly anularService: AnularService) {}

  @Put('anular/:id')
  @ApiOperation({
    summary: 'Anular una factura',
    description:
      'Solo puede anularse una factura en estado emitida. El saldo pendiente se establece en 0 y el estado cambia a anulada.',
  })
  @ApiResponse({ status: 200, description: 'Factura anulada exitosamente' })
  @ApiResponse({ status: 400, description: 'Factura no valida' })
  @ApiResponse({ status: 401, description: 'Proceso de anulacion invalido' })
  @ApiResponse({ status: 404, description: 'Proceso de anulacion invalido' })
  anular(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.anularService.anular(id, user.tenantId);
  }
}
