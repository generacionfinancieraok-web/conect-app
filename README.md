# Conect — Plataforma de compraventa local (Argentina)

MVP full-stack estilo OfferUp construido con **Next.js 14**, **Prisma**, **Socket.io** y **MercadoPago**.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Next.js API Routes + servidor custom (Socket.io) |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | NextAuth.js (Google + email/contraseña) |
| Imágenes | Cloudinary |
| Chat en tiempo real | Socket.io |
| Pagos | MercadoPago Checkout Pro |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                   # Home / feed
│   ├── login/page.tsx             # Login
│   ├── register/page.tsx          # Registro
│   ├── search/page.tsx            # Búsqueda + filtros
│   ├── listing/
│   │   ├── new/page.tsx           # Crear publicación
│   │   └── [id]/page.tsx          # Detalle de publicación
│   ├── profile/[id]/page.tsx      # Perfil de usuario
│   ├── inbox/
│   │   ├── page.tsx               # Lista de conversaciones
│   │   └── [id]/page.tsx          # Chat
│   ├── payment/
│   │   ├── success/page.tsx
│   │   ├── failure/page.tsx
│   │   └── pending/page.tsx
│   └── api/
│       ├── auth/                  # NextAuth + registro
│       ├── listings/              # CRUD publicaciones
│       ├── search/                # Búsqueda full-text
│       ├── categories/            # Categorías
│       ├── conversations/         # Chat + mensajes
│       ├── upload/                # Subida de imágenes
│       └── payments/              # MercadoPago
├── components/
│   ├── Navbar.tsx
│   ├── ListingCard.tsx
│   └── ChatWindow.tsx             # Chat con Socket.io
├── lib/
│   ├── auth.ts                    # Config NextAuth
│   ├── prisma.ts                  # Cliente Prisma singleton
│   ├── cloudinary.ts              # Upload/delete imágenes
│   ├── mercadopago.ts             # Checkout Pro
│   └── utils.ts                  # formatPrice, PROVINCES, cn
└── types/
    ├── index.ts                   # Tipos de dominio
    └── next-auth.d.ts             # Augmentación de tipos
```

---

## Setup rápido

### 1. Requisitos previos
- Node.js 18+
- PostgreSQL local o en la nube (Neon, Supabase, Railway)
- Cuenta Cloudinary (gratis)
- Credenciales MercadoPago (cuenta de vendedor)
- Proyecto OAuth en Google Cloud Console

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores:

```bash
cp .env.example .env.local
```

```env
# PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/conectapp"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-uno-con: openssl rand -base64 32"

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cloudinary (cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# MercadoPago (mercadopago.com.ar/developers)
MERCADOPAGO_ACCESS_TOKEN=""
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

### 4. Base de datos

```bash
# Crear las tablas
npm run db:migrate

# Generar el cliente de Prisma
npm run db:generate

# Cargar categorías iniciales
npm run db:seed
```

### 5. Correr en desarrollo

```bash
npm run dev
```

El servidor arranca en `http://localhost:3000` con Socket.io integrado.

---

## Funcionalidades del MVP

- **Publicaciones**: crear, editar, eliminar artículos con hasta 8 fotos
- **Búsqueda**: texto libre + filtros por categoría, provincia, estado y precio
- **Autenticación**: Google OAuth + email/contraseña con JWT
- **Chat en tiempo real**: Socket.io, indicador "escribiendo...", historial persistido
- **Pagos**: MercadoPago Checkout Pro con webhook de confirmación
- **Perfiles**: calificaciones, reseñas, publicaciones por usuario
- **Responsive**: diseño mobile-first

---

## Próximos pasos (roadmap)

- [ ] Notificaciones push (web push / FCM)
- [ ] Búsqueda geolocalizada (PostGIS o Google Places)
- [ ] Moderación de publicaciones
- [ ] Sistema de favoritos persistido
- [ ] App móvil (React Native / Expo)
- [ ] Panel de administración
- [ ] Envíos con Andreani / OCA integrado
