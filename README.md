# AutomatizaBot — SaaS de automatización por WhatsApp

## Cómo levantar el proyecto

### 1. Requisitos
- Node.js 20+
- Docker Desktop
- Git

### 2. Levantar la base de datos

```bash
docker-compose up -d
```

Esto levanta PostgreSQL en el puerto 5432 y Redis en el 6379.

### 3. Configurar el backend

```bash
cd backend
cp .env.example .env   # ya está copiado
npx prisma migrate dev --name init
npm run start:dev
```

El backend corre en: http://localhost:3001/api/v1

### 4. Levantar el frontend

```bash
cd frontend
npm run dev
```

El panel web corre en: http://localhost:3000

---

## Estructura del proyecto

```
/
├── backend/           → API + lógica del bot (NestJS)
│   ├── src/
│   │   ├── auth/          → login y registro
│   │   ├── appointments/  → turnos
│   │   ├── customers/     → pacientes
│   │   ├── tenants/       → configuración del negocio
│   │   └── whatsapp/      → bot de WhatsApp
│   └── prisma/
│       └── schema.prisma  → base de datos
├── frontend/          → Panel web (Next.js)
│   └── app/
│       ├── login/         → pantalla de login
│       ├── register/      → crear cuenta
│       └── dashboard/     → panel principal
└── docker-compose.yml → base de datos local
```

## Cómo funciona el bot

1. Paciente escribe "quiero un turno" al WhatsApp del negocio
2. El bot pregunta la fecha deseada
3. Consulta disponibilidad real y muestra opciones
4. Paciente elige el horario
5. Bot confirma y guarda el turno
6. Automáticamente el dueño lo ve en el panel web

## Conectar WhatsApp

En el archivo `backend/.env`, activar:
```
WHATSAPP_ENABLED=true
```

Al iniciar el backend, aparece un QR en la terminal. Escanearlo con el WhatsApp del negocio.
