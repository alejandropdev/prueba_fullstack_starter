---
name: create-nestjs-module
description: Genera el esqueleto base de un módulo NestJS con entity, service, controller, module y DTOs siguiendo las convenciones del proyecto. Úsalo cuando el usuario pida crear un módulo nuevo con nombre, función y propósito específicos.
---

# Create NestJS Module

Genera módulos NestJS completos siguiendo las convenciones del proyecto.

## Cuándo Usar Esta Skill

Usa esta skill cuando el usuario:
- Pida "crear módulo de [nombre]" o "generar módulo para [función]"
- Solicite "nuevo módulo NestJS" con nombre, función y propósito
- Necesite esqueleto de módulo con entity, service, controller y DTOs
- Pida "crear [nombre] module" o "generar [nombre] CRUD"

## Input Requerido

El usuario debe proporcionar:
1. **nombre**: Nombre del módulo en plural (ej: `productos`, `categorias`, `ordenes`)
2. **funcion**: Descripción breve del módulo (ej: `Gestión de productos del catálogo`)
3. **propósito**: Para qué sirve el módulo (ej: `CRUD de precios multi-tenant`)

## Convenciones del Proyecto

1. **Nombres**:
   - Módulo: plural en kebab-case para archivos, PascalCase para clases
   - Entity: singular PascalCase (ej: `Producto`, `Categoria`)
   - Controller: plural PascalCase (ej: `ProductosController`)
   - Service: plural PascalCase (ej: `ProductosService`)
   - Ruta HTTP: plural en kebab-case (ej: `/productos`)

2. **Multi-tenant**:
   - Todas las queries incluyen `tenantId` del usuario autenticado
   - Cross-tenant → 404, no 403
   - Usar `@CurrentUser() user: AuthenticatedUser` para obtener tenantId

3. **Dinero**:
   - NUMERIC como `string` en TypeScript
   - Usar helpers de `decimal.js` de `src/common/utils/money.util.ts`
   - Nunca convertir a `number`/float

4. **Swagger**:
   - `@ApiTags('nombre-modulo')`
   - `@ApiBearerAuth()`
   - `@ApiOperation({ summary: '...', description: '...' })`
   - `@ApiResponse({ status: 200, description: '...' })`
   - `@ApiResponse({ status: 401, description: 'No autorizado' })`
   - `@ApiResponse({ status: 404, description: '...' })`

5. **Auth**:
   - `@UseGuards(JwtAuthGuard)` en controladores
   - `@CurrentUser() user: AuthenticatedUser` para obtener usuario
   - Importar de `../../common/guards/jwt-auth.guard`
   - Importar de `../../common/decorators/current-user.decorator`
   - Importar de `../../common/interfaces/jwt-payload.interface`

## Archivos a Generar

Para cada módulo, crear en `src/modules/[nombre]/`:

1. `[nombre].module.ts` - Módulo NestJS
2. `[nombre].controller.ts` - Controlador con endpoints
3. `[nombre].service.ts` - Servicio con lógica de negocio
4. `entities/[entidad-singular].entity.ts` - Entidad TypeORM
5. `dto/create-[nombre].dto.ts` - DTO para creación
6. `dto/update-[nombre].dto.ts` - DTO para actualización

## Pasos de Generación

### Paso 1: Extraer parámetros
Del mensaje del usuario, extraer:
- `nombre` → ej: `productos`
- `funcion` → ej: `Gestión de productos del catálogo`
- `propósito` → ej: `CRUD de precios multi-tenant`

### Paso 2: Derivar nombres
- `ENTITY_NAME`: Convertir `nombre` a singular PascalCase
  - `productos` → `Producto`
  - `categorias` → `Categoria`
  - `ordenes` → `Orden`
- `ENTITY_NAME_LOWER`: singular en minúsculas
  - `Producto` → `producto`
- `MODULE_NAME_UPPER`: nombre en PascalCase con Module
  - `productos` → `ProductosModule`

### Paso 3: Leer templates
Leer cada archivo `.template` del directorio `templates/` de la skill.

### Paso 4: Reemplazar placeholders
En cada template, reemplazar:
- `{{MODULE_NAME}}` → nombre del módulo (ej: `productos`)
- `{{MODULE_NAME_UPPER}}` → nombre PascalCase (ej: `Productos`)
- `{{ENTITY_NAME}}` → entidad singular (ej: `Producto`)
- `{{ENTITY_NAME_LOWER}}` → entidad minúscula (ej: `producto`)
- `{{DESCRIPTION}}` → propósito del módulo
- `{{FUNCTION}}` → función del módulo
- `{{DATE}}` → fecha actual

### Paso 5: Crear estructura de directorios
```
src/modules/[nombre]/
├── entities/
└── dto/
```

### Paso 6: Escribir archivos
Crear cada archivo con el contenido generado.

### Paso 7: Actualizar registros
1. Actualizar `src/app.module.ts`:
   - Agregar import del módulo
   - Agregar módulo al array `imports`

2. Actualizar `src/database/data-source.ts`:
   - Agregar import de la entidad
   - Agregar entidad al array `entities`

## Placeholders para Templates

| Placeholder | Descripción | Ejemplo |
|-------------|-------------|---------|
| `{{MODULE_NAME}}` | Nombre del módulo plural | `productos` |
| `{{MODULE_NAME_UPPER}}` | Nombre PascalCase | `Productos` |
| `{{ENTITY_NAME}}` | Entidad singular PascalCase | `Producto` |
| `{{ENTITY_NAME_LOWER}}` | Entidad singular minúscula | `producto` |
| `{{DESCRIPTION}}` | Descripción del módulo | `Gestión de productos` |
| `{{FUNCTION}}` | Función del módulo | `CRUD de precios` |
| `{{DATE}}` | Fecha actual | `2026-09-17` |

## Ejemplo de Uso

**Usuario**: "Crear módulo de productos para gestión de catálogo con precios multi-tenant"

**Parámetros extraídos**:
- `nombre`: `productos`
- `función`: `Gestión de productos del catálogo`
- `propósito`: `CRUD de precios multi-tenant`

**Archivos generados**:
1. `src/modules/productos/productos.module.ts`
2. `src/modules/productos/productos.controller.ts`
3. `src/modules/productos/productos.service.ts`
4. `src/modules/productos/entities/producto.entity.ts`
5. `src/modules/productos/dto/create-productos.dto.ts`
6. `src/modules/productos/dto/update-productos.dto.ts`

## Notas Importantes

1. **No usar CLI de NestJS**: Este proyecto no tiene CLI configurado, por eso se generan archivos manualmente
2. **Snake_case en DB**: Columnas en snake_case, propiedades en camelCase
3. **UUIDs**: Entidades usan `@PrimaryGeneratedColumn('uuid')`
4. **Tenant obligatorio**: Toda entidad de negocio debe tener relación con Tenant
5. **Money como string**: Si hay campos monetarios, usar `type: 'numeric'` y `string` en TS
