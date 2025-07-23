# 🏙️ Sistema de Gestión Ciudadana - Backend

**Plataforma digital para la gestión ciudadana con red social integrada, moderación IA y notificaciones en tiempo real**

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## 📋 Descripción del Proyecto

Este backend, desarrollado con **NestJS**, implementa un sistema completo de gestión ciudadana que permite a los usuarios:

- 🗺️ **Reportar incidentes urbanos** con ubicación GPS
- 💬 **Realizar consultas** de texto y voz a autoridades
- 📱 **Interactuar socialmente** mediante publicaciones y comentarios
- 🤖 **Moderación automática** de contenido con IA
- 🔔 **Recibir notificaciones** en tiempo real
- 📁 **Subir archivos multimedia** a la nube

---

## 🏗️ Arquitectura del Sistema

### **Tipo de Arquitectura**
**Monolito Modularizado** con servicios externos integrados:
- ✅ Un solo proceso NestJS con múltiples módulos
- ✅ Base de datos PostgreSQL centralizada  
- ✅ Integración con servicios AWS (S3)
- ✅ WebSockets para comunicación en tiempo real

---

## 📁 Estructura de Módulos

### **🔐 AUTH (`/src/auth/`)**
**Sistema de autenticación y autorización**
- 🔑 Registro y login con JWT
- 🔒 Encriptación bcrypt de contraseñas
- 🛡️ Guards para protección de rutas
- 👤 Decoradores personalizados (`@ActiveUser`, `@Roles`)
- 🌍 Integración con Google OAuth

**Endpoints principales:**
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión

---

### **👥 USERS (`/src/users/`)**
**Gestión completa de usuarios**
- 📝 CRUD de usuarios con validaciones
- 🔗 Relaciones con incidentes, publicaciones, comentarios
- 📱 Tracking de dispositivos únicos
- 🗑️ Soft deletes

**Entidad User:**
```typescript
{
  id: number
  name: string
  email: string (único)
  password: string (encriptado)
  dispositivo?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

---

### **❓ CONSULTAS (`/src/consultas/`)**
**Sistema de consultas ciudadanas**
- 📝 Consultas de texto y voz
- 📋 Historial personal de consultas
- 🔍 Búsqueda por ID específico

**Endpoints:**
- `POST /api/consultas` - Crear nueva consulta
- `GET /api/consultas/historial` - Ver historial personal
- `GET /api/consultas/historial/:id` - Consulta específica

---

### **🗺️ INCIDENTES (`/src/incidentes/`)**
**Gestión de incidentes urbanos con geolocalización**
- 📍 Reportes con coordenadas GPS (lat,lng)
- 🔍 Búsqueda por área geográfica
- 🏷️ Filtrado por tipo de incidente
- 📊 Paginación y estadísticas

**Características especiales:**
- Búsqueda por área con coordenadas bounds
- Filtrado por tipo de incidente
- Búsqueda textual en descripciones
- Relación con múltiples publicaciones

**Endpoints avanzados:**
- `GET /api/incidentes/area?latMin=-16.55&latMax=-16.45&lngMin=-68.15&lngMax=-68.05`
- `GET /api/incidentes/tipo/accidente`
- `GET /api/incidentes/buscar?q=tráfico`

---

### **📱 PUBLICACIONES (`/src/publicaciones/`)**
**Red social con moderación IA**
- 📸 Publicaciones con texto y/o multimedia
- 🤖 **Moderación automática por IA**
- 🔗 Asociación opcional con incidentes
- 📄 Feed paginado con estados

**Estados de moderación:**
- ⏳ `pendiente` - En proceso de revisión
- ✅ `aprobado` - Publicado públicamente  
- ❌ `rechazado` - Bloqueado por IA

**Flujo de moderación:**
1. Usuario crea publicación → Estado: `pendiente`
2. **IA procesa asíncronamente** en segundo plano
3. Estado actualizado según resultado IA
4. **Notificación WebSocket** al usuario

---

### **💬 COMENTARIOS (`/src/comentarios/`)**
**Sistema de comentarios jerárquicos con IA**
- 🌳 **Comentarios anidados** (respuestas a respuestas)
- 🤖 **Moderación automática por IA**
- 🔔 **Notificaciones en tiempo real**
- 📊 Paginación y threading

**Características:**
- Estructura de árbol con `comentario_padre`
- Moderación IA de contenido de texto
- Notificaciones automáticas a autores
- Prevención de autonotificaciones

---

### **🔔 NOTIFICATIONS (`/src/notifications/`)**
**Sistema de notificaciones en tiempo real**
- ⚡ **WebSockets con Socket.IO**
- 🔐 Autenticación JWT en WebSockets
- 📱 Soporte multi-dispositivo
- 🏠 Salas personales por usuario

**Tipos de notificaciones:**
- `nuevo_comentario` - Comentarios en tus publicaciones
- `nueva_respuesta` - Respuestas a tus comentarios  
- `publicacion_aprobada/rechazada` - Resultado moderación IA
- `comentario_aprobado/rechazado` - Resultado moderación IA

**Conexión WebSocket:**
```javascript
// Cliente se conecta a /notifications con JWT
socket.emit('connect', { token: 'jwt_token_here' })
```

---

### **📁 UPLOAD (`/src/upload/`)**
**Gestión de archivos multimedia con AWS S3**
- ☁️ Subida directa a AWS S3
- ✅ Validación de tipos MIME
- 📏 Límites de tamaño por tipo
- 🔒 URLs firmadas para acceso temporal

**Tipos permitidos:**
- **Imágenes**: jpeg, png, gif, webp (máx. 10MB)
- **Videos**: mp4, mpeg, quicktime (máx. 50MB)

**Endpoints:**
- `POST /api/upload/single` - Subir archivo individual

---

## 🤖 Inteligencia Artificial Integrada

### **ModeracionIAService - Moderación Automática de Contenido**

**Ubicación:** `src/common/services/moderacion-ia.service.ts`

#### **🔍 Análisis de Texto**
```typescript
async revisarTexto(texto: string): Promise<'aprobado' | 'rechazado'>
```
- **Detección de palabras prohibidas**: spam, ofensivo, violencia, drogas, estafa
- **Probabilidad de aprobación**: 90% si no hay palabras prohibidas
- **Delay simulado**: 1 segundo (simula procesamiento real)

#### **🖼️ Análisis de Imágenes**  
```typescript
async revisarImagen(rutaImagen: string): Promise<'aprobado' | 'rechazado'>
```
- **Validación de rutas** y nombres de archivo
- **Detección de contenido sospechoso**: virus, malware, hack
- **Probabilidad de aprobación**: 85% para imágenes válidas
- **Delay simulado**: 2 segundos

#### **📋 Análisis Completo**
```typescript
async revisarPublicacion(contenidoTexto?: string, rutaMedia?: string)
```
- **Procesamiento paralelo** de texto e imagen
- **Política estricta**: Si cualquier elemento es rechazado, toda la publicación se rechaza
- **Notificación automática** al usuario vía WebSocket

### **🔄 Flujo de Moderación IA**

1. **Usuario crea contenido** → Estado inicial: `pendiente`
2. **Procesamiento asíncrono** (no bloquea respuesta al usuario)
3. **IA analiza contenido** según tipo
4. **Estado actualizado** en base de datos
5. **Notificación WebSocket** enviada al usuario
6. **Limpieza automática** de archivos rechazados en S3

---

## ☁️ Servicios Externos Integrados

### **🗄️ AWS S3 (Almacenamiento)**
**Servicio:** `AwsS3Service`
- **Configuración**: Variables de entorno para credenciales
- **Características**: ACLs públicos, URLs firmadas, validación de tipos
- **Gestión**: Subida, eliminación y acceso temporal a archivos

### **🐘 PostgreSQL (Base de Datos)**
- **ORM**: TypeORM con autoLoadEntities
- **Configuración**: SSL para servicios en la nube (Render, etc.)
- **Migraciones**: Sincronización automática en desarrollo

### **⚡ Socket.IO (WebSockets)**
- **Namespace**: `/notifications` para notificaciones
- **Autenticación**: JWT en handshake
- **Salas**: Una sala personal por usuario (`user_${userId}`)

---

## 🚀 Instalación y Configuración

### **📋 Prerrequisitos**
- Node.js 18+
- PostgreSQL 13+
- Cuenta AWS con bucket S3
- Yarn package manager

### **⚙️ Variables de Entorno**
Crear archivo `.env`:
```env
# Base de Datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=tu_usuario
DATABASE_PASSWORD=tu_password
DATABASE_NAME=sistema_ciudadano
DATABASE_SSL=false

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_S3_BUCKET_NAME=tu-bucket-name

# Puerto
PORT=3000
```

### **📦 Instalación**
```bash
# Instalar dependencias
yarn install

# Modo desarrollo
yarn run start:dev

# Modo producción
yarn run build
yarn run start:prod
```

---

## 📚 Documentación de la API

### **🔗 Swagger UI**
La documentación completa está disponible en:
```
http://localhost:3000/api
```

La documentación incluye:
- Descripción detallada de todos los endpoints
- Esquemas de datos
- Autenticación JWT
- Ejemplos de peticiones y respuestas

### **🔑 Autenticación**
- **Método**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`
- **Obtención**: Endpoint `POST /api/auth/login`

### **📋 Endpoints Principales**

#### **Autenticación**
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login

#### **Incidentes**
- `GET /api/incidentes` - Lista paginada
- `POST /api/incidentes` - Crear incidente
- `GET /api/incidentes/area` - Búsqueda geográfica
- `GET /api/incidentes/tipo/:tipo` - Por tipo

#### **Publicaciones**  
- `GET /api/publicaciones` - Feed público (solo aprobadas)
- `POST /api/publicaciones` - Crear con multimedia
- `GET /api/publicaciones/mis-publicaciones` - Propias
- `GET /api/publicaciones/incidente/:id` - Por incidente

#### **Comentarios**
- `GET /api/publicaciones/:id/comentarios` - De una publicación
- `POST /api/publicaciones/:id/comentarios` - Crear comentario
- `POST /api/publicaciones/:id/comentarios/:id/responder` - Responder

---

## 🧪 Testing

```bash
# Tests unitarios
yarn run test

# Tests e2e
yarn run test:e2e

# Coverage
yarn run test:cov
```

---

## 📊 Características Técnicas

### **🏗️ Arquitectura**
- **Framework**: NestJS (Node.js + TypeScript)
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT + bcrypt
- **WebSockets**: Socket.IO para tiempo real
- **Almacenamiento**: AWS S3
- **Documentación**: Swagger/OpenAPI

### **🔒 Seguridad**
- Encriptación de contraseñas con bcrypt
- Validación de datos con class-validator
- Guards personalizados para rutas protegidas
- Sanitización automática de inputs
- CORS configurado para frontend

### **⚡ Performance**
- Procesamiento asíncrono de IA
- Paginación en todos los listados
- Índices de base de datos optimizados
- Carga lazy de relaciones TypeORM
- Compresión de respuestas HTTP

### **🚀 Escalabilidad**
- Modularización clara de responsabilidades
- Servicios desacoplados
- Preparado para migración a microservicios
- Cacheo configurado para consultas frecuentes

---

## 👥 Contribución

1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## 📄 Licencia

Este proyecto es privado y está bajo licencia UNLICENSED.

---

## 🆘 Soporte

Para soporte técnico o preguntas sobre el proyecto:
- 📧 **Email**: equipo-desarrollo@proyecto.com
- 📱 **Slack**: #backend-support
- 📖 **Wiki**: [Documentación interna](link-interno)

---

**Desarrollado con ❤️ por el equipo de SW1**
