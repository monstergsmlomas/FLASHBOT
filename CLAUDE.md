# GSM-FIX / FLASHBOT — Archivo de Contexto para Claude

> Pegá este archivo al inicio de cada sesión nueva para que Claude tenga contexto completo del proyecto.

## 0. Instrucciones para Claude

- **No pasar archivos completos.** Siempre dar solo los cambios puntuales con instrucciones claras de dónde aplicarlos.
- Ser preciso y conciso. El usuario tiene conocimientos limitados de código.
- Guiar paso a paso usando Ctrl+H (buscar y reemplazar) en VS Code.
- Cuando hay muchos cambios acumulados o el archivo está desordenado, pedir el archivo actualizado antes de continuar.

---

## 1. ¿Qué es el proyecto?

**GSM-FIX** (nombre en desarrollo: **FLASHBOT**) es un SaaS para técnicos electrónicos y dueños de talleres de reparación de celulares. Centraliza la gestión del negocio y automatiza la atención al cliente vía WhatsApp.

**Clientes objetivo:** dueños de talleres de reparación de celulares en Argentina.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js (App Router) | 14+ |
| Backend | NestJS | 11+ |
| Estilos | Tailwind CSS | - |
| Base de datos | Supabase (PostgreSQL) | - |
| Lenguaje | TypeScript (full stack) | 5.7+ |
| Deploy Frontend | Vercel | - |
| Deploy Backend | Render | - |

**Puertos en desarrollo:**
- Frontend: localhost:3000
- Backend: localhost:3001

---

## 3. Estructura de carpetas

```
FLASHBOT/
├── frontend/
│   ├── app/
│   │   └── dashboard/
│   │       ├── layout.tsx         # Sidebar y navegación ✅
│   │       ├── catalogo/
│   │       │   └── page.tsx       # Catálogo proveedor ✅
│   │       └── stock/
│   │           └── page.tsx       # Stock propio ✅
│   ├── lib/
│   │   └── supabase.ts            # Cliente Supabase ✅
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── catalogo/
│   │   │   ├── catalogo.controller.ts  ✅
│   │   │   ├── catalogo.module.ts      ✅
│   │   │   └── catalogo.service.ts     ✅
│   │   ├── app.module.ts               ✅
│   │   └── main.ts                     ✅
│   └── package.json
└── CLAUDE.md
```

---

## 4. Base de datos (Supabase)

**Proyecto:** https://albtetatnyhbokbzapbx.supabase.co

Tablas creadas con RLS habilitado:
- talleres — cada cliente del SaaS (multi-tenant)
- whatsapp_config — configuración de WhatsApp por taller
- categorias — categorías con margen de ganancia
- productos — repuestos y accesorios
- presupuestos — presupuestos generados
- presupuesto_items — detalle de cada presupuesto
- conversaciones — historial del bot de WhatsApp

**Columnas de la tabla `productos`:**
- id, nombre, tipo, calidad, con_marco, costo, precio_final, activo, taller_id (originales)
- origen TEXT — 'proveedor' | 'stock'
- cantidad INTEGER DEFAULT 0
- tipo_producto TEXT — 'repuesto' | 'accesorio'
- marca TEXT DEFAULT 'OTRAS' ← agregada en sesión 3

**Taller de desarrollo (temporal hasta tener auth):**
- taller_id: `00000000-0000-0000-0000-000000000000`
- nombre: Taller Demo

**Política RLS temporal para desarrollo:**
```sql
drop policy if exists "taller ve sus productos" on productos;
create policy "desarrollo sin auth" on productos
  for all using (true)
  with check (true);
```

---

## 5. Lo que está hecho ✅

### Backend
- Endpoint POST /catalogo/upload-pdf funcionando
- Parseo de PDF con pdf2json
- Parser con regex `/(MODULO|BATERIA|LCD|TACTIL)\s+([^$]+?)\s+\$([0-9.,]+(?:\.[0-9]{2})?)/g`
- Detecta tipo y categoría (OLED, INCELL, GX, PANTALLA INFINITA)
- Filtra productos con precio $0.00
- Precio parseado correctamente con `.replace(/,/g, '')`
- CORS configurado para localhost:3000 y Vercel
- Puerto cambiado a 3001

### Frontend — Catálogo (/dashboard/catalogo)
- Dashboard con sidebar y navegación
- Subida de Excel/CSV con parseo local
- Botón Subir PDF conectado al backend en localhost:3001
- Tabla editable: nombre, categoría, marca, costo, margen, precio final
- Edición bidireccional margen-precio final
- Ajuste masivo por categoría o marca
- Filtro por marca Y por categoría en la tabla
- Supabase conectado — productos se cargan al abrir el catálogo
- Botón Guardar en BD — guarda todos los productos en Supabase
- Botón Limpiar BD — borra todos los productos para reimportar sin duplicados
- Modal "Agregar producto" con marca/categoría editables, selector origen, edición bidireccional
- Al importar PDF/Excel se marca automáticamente origen = 'proveedor'

### Frontend — Stock (/dashboard/stock)
- Solo muestra productos con origen = 'stock'
- Modal agregar con selector Repuesto / Accesorio
- Categorías sugeridas según tipo
- Marca editable a mano con datalist
- Campos: nombre, marca, categoría, cantidad, costo, precio venta
- Modal de movimiento: entrada / salida con cantidad variable
- Cantidad se guarda y actualiza en Supabase en tiempo real
- Colores por nivel de stock: verde (ok) / amarillo (≤3) / rojo (0)
- Métricas en header: total en stock, stock bajo, sin stock
- Filtros: por tipo (todos/repuesto/accesorio), por marca y buscador por nombre/marca ✅
- Link en sidebar con ícono Archive
- **Importación desde Excel inteligente** ✅
  - Detecta columnas automáticamente por nombre (sin mapeo manual)
  - Combina columnas "Repuesto" + "Modelo" para formar el nombre completo (ej: "MODULO OLED IPHONE 12")
  - Autocategoriza según el texto del producto (OLED, INCELL, GX, BATERIA, CABLE, etc.)
  - Si el Excel trae columna "Categoría", la usa; si no, la detecta automáticamente
  - Muestra preview de los primeros 5 productos antes de confirmar
  - Si hay error, muestra tabla de ejemplo con el formato correcto
- **Selección y borrado múltiple** ✅
  - Checkbox por fila y checkbox "seleccionar todos" en el header
  - Botón "🗑️ Borrar X seleccionados" aparece solo cuando hay selección
  - Confirmación antes de borrar
- **Editar producto** ❌ — pendiente

### Base de datos
- Supabase creado con todas las tablas y RLS
- Taller demo creado para desarrollo sin auth
- Columnas origen, cantidad, tipo_producto, marca agregadas
- 439 productos importados correctamente desde PDF

---

## 6. Lo que falta ❌

### Stock
- Editar producto desde la tabla (nombre, marca, categoría, costo, precio)

### Bot de WhatsApp
- Integración WhatsApp Business API
- Lógica del bot:
  - Consulta de precio → buscar primero en stock propio, luego en catálogo proveedor
  - Si está en stock: "tengo en stock, entrega inmediata, precio $X"
  - Si está en catálogo: "disponible en 24-48hs, precio $X"
  - Si es accesorio: flujo de venta directa
  - Si es repuesto: flujo de presupuesto de reparación
- Guardar conversaciones y presupuestos en Supabase

### Sistema general
- Autenticación con Supabase Auth
- Variables de entorno (.env)
- Deploy Vercel + Render
- Multi-tenant funcionando (reemplazar taller_id hardcodeado por el del usuario autenticado)

---

## 7. Decisiones técnicas

- **pdf2json**: librería final para parseo de PDF en NestJS. Usar `import PDFParser from 'pdf2json'`
- **pdf-parse**: NO usar — da error `pdf is not a function`
- **pdfjs-dist**: NO usar — solo tiene archivos `.mjs`, no compatible con CommonJS/NestJS
- `decodeURIComponent` en pdf2json: envolver en try/catch porque falla con tildes y ñ
- Precio parseado con `.replace(/,/g, '')` — NO usar `.replace(/\./g, '').replace(',', '.')` porque convierte `7,200.00` en `7.2`
- Backend en 3001: Next.js ocupa 3000
- Edición bidireccional: margen cambia precio / precio cambia margen
- Multi-tenant: todas las tablas tienen taller_id como FK
- Productos con precio $0.00 se filtran intencionalmente
- taller_id hardcodeado como `00000000-0000-0000-0000-000000000000` hasta implementar auth
- **origen**: campo que diferencia catálogo del proveedor ('proveedor') de stock físico ('stock')
- **tipo_producto**: diferencia repuestos (se usan en reparaciones) de accesorios (se venden directo)
- **cantidad**: solo relevante para origen='stock', los de proveedor quedan en 0
- **marca**: columna agregada a la tabla productos en sesión 3 (`ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'OTRAS'`)
- Importación Excel sin mapeo manual: el sistema detecta columnas por palabras clave
- Nombre del producto en stock = columna "Repuesto" + columna "Modelo" (si existe)
- Autocategorización por keywords en el nombre: OLED, INCELL, GX, MODULO, BATERIA, CABLE, etc.
- Bot lógica de búsqueda: stock propio primero → catálogo proveedor → no disponible

---

## 8. Columnas Excel reconocidas automáticamente

| Campo | Palabras clave detectadas |
|-------|--------------------------|
| Nombre/Repuesto | nombre, producto, repuesto, descripcion, articulo |
| Modelo | modelo |
| Costo | costo, precio costo, compra |
| Precio Venta | precio venta, venta, precio |
| Marca | marca |
| Categoría | categoria, tipo, rubro |
| Cantidad | cantidad, stock, qty |

---

## 9. Comandos

```bash
# Backend - corre en localhost:3001
cd backend && npm run start:dev

# Frontend - corre en localhost:3000
cd frontend && npm run dev
```

---

## 10. Variables de entorno

Frontend (`frontend/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://albtetatnyhbokbzapbx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYnRldGF0bnloYm9rYnphcGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDYwNjcsImV4cCI6MjA5MTA4MjA2N30.x0EWwr-snOQuSCQzDpl22FyhNnxVpuYPXGTsrjUAfxQ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Backend (`backend/.env`):
```
PORT=3001
SUPABASE_URL=https://albtetatnyhbokbzapbx.supabase.co
SUPABASE_SERVICE_KEY=<pendiente>
```

---

## 11. Problemas conocidos y soluciones

| Problema | Solución |
|----------|----------|
| pdf is not a function | Migrar a pdf2json |
| pdfjs-dist no compila | Solo tiene .mjs, no compatible con NestJS/CommonJS |
| decodeURIComponent URI malformed | Envolver en try/catch, usar r.T como fallback |
| Precio 7,200 se importa como 7.2 | Usar `.replace(/,/g, '')` en vez de reemplazar puntos |
| EADDRINUSE puerto 3000 | Backend movido a 3001 |
| Frontend apuntaba a puerto 3000 | Cambiar URL del fetch a localhost:3001 |
| Foreign key error al guardar | Crear taller demo con UUID 00000000-0000-0000-0000-000000000000 |
| Tabla con scroll horizontal | Sacar whitespace-nowrap y min-w-[200px] del input nombre |
| Botones fuera del flex container | Asegurarse que estén dentro del div con className que incluye flex |
| Error 'marca' column not found | Ejecutar: ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'OTRAS' |
| Funciones duplicadas en page.tsx | Ocurrió al hacer múltiples reemplazos; solución: pedir el archivo y corregir puntualmente |