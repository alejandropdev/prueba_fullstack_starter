import { Controller, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface';
import { EditarValorService } from './editar-valor.service';
import { EditarValorDto } from './dto/editar-valor.dto';

@ApiTags('facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facturas')
export class EditarValorController {
  constructor(private readonly editarValorService: EditarValorService) {}

  @Put('edit/valor/:id')
  @ApiOperation({
    summary: 'Modificar el valor de una factura',
    description:
      'Actualiza el monto_total y saldo_pendiente de una factura en estado emitida. Solo accesible por usuarios autenticados del mismo tenant.',
  })
  @ApiResponse({ status: 200, description: 'Factura modificada exitosamente' })
  @ApiResponse({ status: 400, description: 'Factura no valida' })
  @ApiResponse({ status: 401, description: 'Proceso de modificacion invalido' })
  @ApiResponse({ status: 404, description: 'Proceso de modificacion invalido' })
  editarValor(
    @Param('id') id: string,
    @Body() editarValorDto: EditarValorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.editarValorService.editarValor(id, user.tenantId, editarValorDto.monto_total);
  }
}
