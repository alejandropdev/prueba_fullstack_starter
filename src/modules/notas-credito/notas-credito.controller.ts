import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { AnularNotaCreditoDto } from './dto/anular-nota-credito.dto';
import { CorregirNotaCreditoDto } from './dto/corregir-nota-credito.dto';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { FindNotasCreditoQueryDto } from './dto/find-notas-credito-query.dto';
import { NotasCreditoService } from './notas-credito.service';

@ApiTags('notas-credito')
@ApiBearerAuth()
@Controller('notas-credito')
@UseGuards(JwtAuthGuard)
export class NotasCreditoController {
  constructor(private readonly notasCreditoService: NotasCreditoService) {}

  @Post()
  @ApiOperation({ summary: 'Emite una nota de crédito y descuenta el saldo de la factura' })
  emitir(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNotaCreditoDto) {
    return this.notasCreditoService.emitir(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista las notas de crédito del tenant autenticado' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindNotasCreditoQueryDto) {
    return this.notasCreditoService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta una nota de crédito y su historial' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notasCreditoService.findOne(id, user);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Consulta quién cambió la nota, cuándo, qué y por qué' })
  findHistorial(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notasCreditoService.findHistorial(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige el monto o el motivo de una nota emitida' })
  corregir(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CorregirNotaCreditoDto,
  ) {
    return this.notasCreditoService.corregir(id, user, dto);
  }

  @Post(':id/anular')
  @HttpCode(200)
  @ApiOperation({ summary: 'Anula una nota emitida y devuelve el monto al saldo de la factura' })
  anular(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnularNotaCreditoDto,
  ) {
    return this.notasCreditoService.anular(id, user, dto);
  }
}
