import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { FindNotificacionesQueryDto } from './dto/find-notificaciones-query.dto';
import { NotasCreditoService } from './notas-credito.service';

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los avisos que quedaron registrados para los clientes del tenant',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindNotificacionesQueryDto) {
    return this.notasCreditoService.findAvisos(user, query);
  }
}
