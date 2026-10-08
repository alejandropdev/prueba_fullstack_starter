import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { FindNotasCreditoQueryDto } from './dto/find-notas-credito-query.dto';
import { UpdateNotaCreditoDto } from './dto/update-nota-credito.dto';
import { NotasCreditoService } from './notas-credito.service';

@Controller('notas-credito')
@UseGuards(JwtAuthGuard)
export class NotasCreditoController {
  constructor(
    private readonly notasCreditoService: NotasCreditoService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotaCreditoDto,
  ) {
    return this.notasCreditoService.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindNotasCreditoQueryDto,
  ) {
    return this.notasCreditoService.findAll(user, query);
  }

  @Get('auditoria/factura/:facturaId')
  findAuditByFactura(
    @CurrentUser() user: AuthenticatedUser,
    @Param('facturaId') facturaId: string,
  ) {
    return this.notasCreditoService.findAuditByFactura(
      user,
      facturaId,
    );
  }

  @Get(':id/auditoria')
  findAuditByNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notasCreditoService.findAuditByNote(user, id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notasCreditoService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNotaCreditoDto,
  ) {
    return this.notasCreditoService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    // DELETE representa una anulación lógica, no elimina el registro.
    return this.notasCreditoService.remove(user, id);
  }
}
