# Módulo de Emergencia

Este módulo proporciona funcionalidades de seguridad para la aplicación móvil, incluyendo gestión de contactos de emergencia y sistema de alertas de pánico.

## Características

### Contactos de Emergencia
- **Máximo 5 contactos** por usuario
- **Información completa**: nombre, teléfono, email, relación
- **Tokens FCM**: Para notificaciones push (Android/iOS)
- **Priorización**: niveles 1-5 (1 = más importante)
- **Gestión completa**: crear, leer, actualizar, eliminar

### Sistema de Alertas de Pánico
- **Botón de emergencia**: activación manual
- **Grabación de video/audio**: máximo 5 minutos
- **Geolocalización**: coordenadas GPS y dirección en tiempo real
- **Notificaciones en tiempo real**: WebSocket para contactos conectados
- **Notificaciones push**: Firebase Cloud Messaging (FCM) ✅ **INTEGRADO Y FUNCIONANDO**
- **Estados de alerta**: activa, resuelta, falsa alarma

## Endpoints

### Contactos de Emergencia

#### Crear contacto
```http
POST /emergency/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "María García",
  "phone": "+34612345678",
  "email": "maria@email.com",
  "relationship": "familia",
  "priority": 1,
  "fcmToken": "fcm_token_del_contacto" // Opcional
}
```

#### Obtener contactos
```http
GET /emergency/contacts
Authorization: Bearer <token>
```

#### Actualizar contacto
```http
PATCH /emergency/contacts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+34687654321",
  "priority": 2
}
```

#### Actualizar token FCM de contacto
```http
PATCH /emergency/contacts/:id/fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "fcmToken": "fcm_token_del_contacto"
}
```

#### Eliminar contacto
```http
DELETE /emergency/contacts/:id
Authorization: Bearer <token>
```

### Alertas de Emergencia

#### Crear alerta (con video)
```http
POST /emergency/alerts
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "description": "Situación de emergencia",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "location": "Madrid, España",
  "type": "panic_button",
  "metadata": {
    "accelerometer": {...},
    "device_info": {...}
  }
}

video: [archivo de video]
```

#### Activar botón de pánico (endpoint específico)
```http
POST /emergency/alerts/panic-button
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "description": "Situación de emergencia",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "location": "Madrid, España",
  "metadata": {
    "accelerometer": {...},
    "device_info": {...}
  }
}

video: [archivo de video]
```

#### Obtener alertas
```http
GET /emergency/alerts
Authorization: Bearer <token>
```

#### Resolver alerta
```http
PATCH /emergency/alerts/:id/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolutionNotes": "Emergencia resuelta"
}
```

#### Marcar como falsa alarma
```http
PATCH /emergency/alerts/:id/false-alarm
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolutionNotes": "Activación accidental"
}
```

### Estadísticas
```http
GET /emergency/stats
Authorization: Bearer <token>
```

### Estado de Servicios de Notificación
```http
GET /emergency/notification-services/status
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "services": {
    "sms": false,
    "email": false,
    "fcm": true,
    "apns": false
  },
  "summary": {
    "websocket": true,
    "sms": false,
    "email": false,
    "pushAndroid": true,
    "pushIOS": true
  },
  "message": "WebSocket y FCM funcionando. Otros servicios requieren configuración adicional."
}
```

## Sistema de Notificaciones

### Tipos de Notificación
- `alerta_emergencia`: Cuando se activa una alerta

### Métodos de Notificación

#### 1. WebSocket (Tiempo Real) ✅
Para contactos que están conectados a la aplicación móvil en tiempo real.

#### 2. Push Notifications (Firebase FCM) ✅ **FUNCIONANDO**
**Integrado con tu sistema existente de incidentes:**
- **Android**: Notificaciones push nativas con sonido de emergencia
- **iOS**: Notificaciones push nativas con sonido de emergencia
- **Configuración**: Usa tu Service Account JSON existente
- **Compatibilidad**: Misma estructura que incidentes

#### 3. SMS (Implementación Futura)
Para enviar mensajes de texto a los números de teléfono de los contactos.

#### 4. Email (Implementación Futura)
Para enviar correos electrónicos con detalles de la emergencia.

### Estructura de Notificación WebSocket
```json
{
  "type": "alerta_emergencia",
  "data": {
    "alert_id": 123,
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@email.com"
    },
    "contact": {
      "id": 1,
      "name": "María García",
      "phone": "+34612345678",
      "email": "maria@email.com"
    },
    "alert": {
      "type": "panic_button",
      "description": "Situación de emergencia",
      "location": "Madrid, España",
      "latitude": 40.4168,
      "longitude": -3.7038,
      "videoUrl": "https://s3.amazonaws.com/...",
      "audioUrl": "https://s3.amazonaws.com/...",
      "duration": 300,
      "metadata": {...}
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "¡ALERTA DE EMERGENCIA! Juan Pérez ha activado el botón de pánico."
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "recipientId": 1
}
```

### Estructura de Notificación FCM
```json
{
  "notification": {
    "title": "🚨 ALERTA DE EMERGENCIA",
    "body": "Juan Pérez ha activado el botón de pánico"
  },
  "data": {
    "type": "emergency_alert",
    "alertId": "123",
    "userId": "1",
    "userName": "Juan Pérez",
    "description": "Situación de emergencia",
    "videoUrl": "https://s3.amazonaws.com/...",
    "audioUrl": "https://s3.amazonaws.com/...",
    "location": "Madrid, España",
    "latitude": "40.4168",
    "longitude": "-3.7038",
    "duration": "300",
    "timestamp": "2024-01-15T10:30:00Z",
    "latitud": "40.4168",
    "longitud": "-3.7038"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "emergency_sound",
      "channelId": "emergency_alerts",
      "priority": "high"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "emergency_sound.wav",
        "badge": 1,
        "priority": "high"
      }
    }
  }
}
```

## Configuración

### Variables de Entorno
```env
# AWS S3 para almacenamiento de archivos
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name

# Firebase Admin SDK (YA CONFIGURADO)
# No necesitas agregar nada al .env
# El sistema usa tu Service Account JSON existente

# Configuración para notificaciones push (futuro)
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id
APNS_PRIVATE_KEY=your_apns_private_key

# Configuración para SMS (futuro)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Configuración para Email (futuro)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
```

### Límites de Archivos
- **Video**: máximo 50MB
- **Formatos soportados**: MP4, MPEG, QuickTime
- **Duración máxima**: 5 minutos

## Seguridad

- **Autenticación JWT** requerida en todos los endpoints
- **Validación de archivos** para prevenir uploads maliciosos
- **Soft delete** para mantener historial
- **Límites de contactos** para prevenir spam

## Base de Datos

### Tablas
- `emergency_contacts`: Contactos de emergencia
- `emergency_alerts`: Alertas de emergencia

### Índices
- `idx_emergency_contacts_user_id`: Búsqueda por usuario
- `idx_emergency_contacts_active`: Contactos activos
- `idx_emergency_alerts_user_id`: Alertas por usuario
- `idx_emergency_alerts_status`: Filtrado por estado
- `idx_emergency_alerts_created_at`: Ordenamiento por fecha

## Uso en Aplicación Móvil

### Flujo de Emergencia
1. Usuario presiona botón de pánico
2. App inicia grabación de video/audio (máx 5 min)
3. App obtiene ubicación GPS
4. App envía alerta al servidor
5. Servidor notifica a todos los contactos de emergencia:
   - **WebSocket**: Para contactos conectados en tiempo real ✅
   - **Push Notifications**: Para contactos con app instalada ✅ **FUNCIONANDO**
   - **SMS**: Para contactos con número de teléfono (futuro)
   - **Email**: Para contactos con email (futuro)
6. Contactos reciben notificación con video y ubicación

### Consideraciones de UX
- **Confirmación**: Preguntar antes de activar alerta
- **Cancelación**: Permitir cancelar durante grabación
- **Feedback**: Mostrar estado de envío
- **Historial**: Acceso a alertas anteriores

## Implementación de Notificaciones Push ✅ **YA FUNCIONANDO**

### Firebase Cloud Messaging (FCM) - Integrado
El sistema ya está configurado y funcionando con tu Service Account JSON existente. **No necesitas hacer nada adicional.**

#### Para el equipo móvil:
1. **Obtener FCM Token**: Cada contacto debe tener su FCM token
2. **Actualizar token**: Usar endpoint `/emergency/contacts/:id/fcm-token`
3. **Recibir notificaciones**: Las notificaciones llegan automáticamente

#### Ejemplo de actualización de token FCM:
```javascript
// En tu app móvil
const updateFCMToken = async (contactId, fcmToken) => {
  const response = await fetch(`/emergency/contacts/${contactId}/fcm-token`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fcmToken })
  });
  return response.json();
};
```

#### Estructura de notificación que recibirán:
```json
{
  "notification": {
    "title": "🚨 ALERTA DE EMERGENCIA",
    "body": "Juan Pérez ha activado el botón de pánico"
  },
  "data": {
    "type": "emergency_alert",
    "alertId": "123",
    "userId": "1",
    "userName": "Juan Pérez",
    "videoUrl": "https://s3.amazonaws.com/...",
    "location": "Madrid, España",
    "latitude": "40.4168",
    "longitude": "-3.7038"
  }
}
```

### Implementaciones Futuras

#### 1. Apple Push Notification Service (APNs) - iOS
```javascript
// Ejemplo de implementación futura
const apnsService = {
  async sendPushNotification(contact, alertData) {
    const apn = require('apn');
    const provider = new apn.Provider({
      token: {
        key: process.env.APNS_PRIVATE_KEY,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APNS_TEAM_ID
      },
      production: false
    });

    const notification = new apn.Notification();
    notification.alert = {
      title: '🚨 Alerta de Emergencia',
      body: `${alertData.user.name} ha activado el botón de pánico`
    };
    notification.topic = 'com.yourapp.emergency';
    notification.payload = {
      alertId: alertData.id,
      videoUrl: alertData.videoUrl,
      location: alertData.location
    };

    return await provider.send(notification, contact.apnsToken);
  }
};
```

#### 2. SMS con Twilio
```javascript
// Ejemplo de implementación futura
const smsService = {
  async sendEmergencySMS(contact, alertData) {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = `🚨 ALERTA DE EMERGENCIA 🚨
${alertData.user.name} ha activado el botón de pánico.
Ubicación: ${alertData.location}
Video: ${alertData.videoUrl}
Responda inmediatamente.`;

    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact.phone
    });
  }
};
```

#### 3. Email con Nodemailer
```javascript
// Ejemplo de implementación futura
const emailService = {
  async sendEmergencyEmail(contact, alertData) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: contact.email,
      subject: '🚨 ALERTA DE EMERGENCIA',
      html: `
        <h2>🚨 ALERTA DE EMERGENCIA 🚨</h2>
        <p><strong>${alertData.user.name}</strong> ha activado el botón de pánico.</p>
        <p><strong>Ubicación:</strong> ${alertData.location}</p>
        <p><strong>Video:</strong> <a href="${alertData.videoUrl}">Ver video</a></p>
        <p><strong>Hora:</strong> ${alertData.timestamp}</p>
        <p>Responda inmediatamente.</p>
      `
    };

    return await transporter.sendMail(mailOptions);
  }
};
```

## Estructura del Proyecto

```
src/
├── common/
│   └── services/
│       ├── aws-s3.service.ts
│       ├── moderacion-ia.service.ts
│       └── emergency-notification.service.ts  ✅ (Servicio compartido)
├── emergency/
│   ├── entities/
│   │   ├── emergency-contact.entity.ts
│   │   └── emergency-alert.entity.ts
│   ├── dto/
│   │   ├── create-emergency-contact.dto.ts
│   │   ├── update-emergency-contact.dto.ts
│   │   ├── create-emergency-alert.dto.ts
│   │   ├── emergency-contact-response.dto.ts
│   │   └── emergency-alert-response.dto.ts
│   ├── emergency.service.ts
│   ├── emergency.controller.ts
│   ├── emergency.module.ts
│   └── README.md
```

## ✅ **Estado Actual**

- **WebSocket**: ✅ Funcionando
- **Push Notifications (FCM)**: ✅ **FUNCIONANDO** (integrado con sistema existente)
- **AWS S3**: ✅ Funcionando para almacenamiento de archivos
- **Base de datos**: ✅ Configurado con TypeORM auto-sync
- **Autenticación**: ✅ JWT integrado
- **Validaciones**: ✅ DTOs y class-validator

## 🚀 **Listo para Producción**

El módulo está completamente funcional y listo para que tu equipo móvil lo implemente. Las notificaciones push ya funcionan con tu configuración existente de Firebase. 

---

## 🔍 ¿Qué está pasando?

- **Tu app móvil** hace un GET a:  
  `https://v9k5scrk-3000.brs.devtunnels.ms/api/emergency/contacts`
- **El backend responde 404 Not Found**.

---

## ✅ ¿El endpoint existe en el backend?

**¡Sí!**  
En tu código tienes:
```typescript
app.setGlobalPrefix('api');
```
Y el controller:
```typescript
@Controller('emergency')
@Get('contacts')
```
Por lo tanto, el endpoint correcto es:  
`/api/emergency/contacts`  
¡Esto está bien!

---

## ⚠️ ¿Por qué 404 solo en este endpoint?

### 1. **El backend no está corriendo en el mismo DevTunnel**
- Si reiniciaste el servidor, DevTunnel puede cambiar la URL.
- Verifica que la URL de DevTunnel sea la misma que la de tu app móvil.

### 2. **El servidor no está corriendo o está caído**
- Si el backend se detuvo, DevTunnel sigue activo pero no puede enrutar la petición.

### 3. **El método HTTP es incorrecto**
- Debe ser GET, no POST ni otro.

### 4. **El endpoint está protegido y el token es inválido**
- Si el token es inválido, deberías recibir 401, pero si el guard falla antes, podría devolver 404.

### 5. **El prefijo /api no está activo**
- Si por alguna razón el backend se arrancó sin el prefijo global, la ruta sería `/emergency/contacts` y no `/api/emergency/contacts`.

---

## 🧪 **¿Cómo probarlo y depurarlo?**

### **A. Prueba manual con curl o Postman**
Usa el mismo token que tu app móvil:
```bash
<code_block_to_apply_changes_from>
curl -X GET "https://v9k5scrk-3000.brs.devtunnels.ms/api/emergency/contacts" -H "Authorization: Bearer TU_TOKEN"
```
- Si recibes 404: el backend no está escuchando en esa ruta en ese DevTunnel.
- Si recibes 401: el token es inválido.
- Si recibes 200: el endpoint funciona.

### **B. Verifica los logs del backend**
- Cuando haces la petición, ¿aparece algún log en la terminal del backend?
- Si no aparece nada, la petición no está llegando (URL o DevTunnel incorrecto).
- Si aparece, revisa qué ruta y método está recibiendo.

### **C. Verifica la URL de DevTunnel**
- ¿La URL de DevTunnel que usas en la app móvil es la misma que la que muestra el backend cuando lo arrancas?
- Si reiniciaste el backend, la URL de DevTunnel puede cambiar.

### **D. Verifica el prefijo global**
- Si por error quitaste o cambiaste `app.setGlobalPrefix('api')`, la ruta sería diferente.

---

## 🚦 **¿Qué hacer ahora?**

1. **Asegúrate de que el backend esté corriendo y muestre "Nest application successfully started".**
2. **Verifica que la URL de DevTunnel sea la misma en la app móvil y en el backend.**
3. **Haz una prueba manual con curl o Postman usando el mismo token y URL.**
4. **Observa los logs del backend cuando haces la petición.**
5. **Si todo está bien y sigue sin funcionar, reinicia DevTunnel y el backend, y actualiza la URL en la app móvil.**

---

## 🎯 **Resumen**

- El endpoint `/api/emergency/contacts` sí existe.
- El 404 indica que la petición no está llegando al backend correcto o la ruta no coincide.
- Verifica URL, método, token y que el backend esté corriendo en el mismo DevTunnel.

¿Quieres que te ayude a hacer una prueba manual con curl o Postman? ¿O puedes pegar aquí la URL de DevTunnel que te muestra el backend al arrancar para comparar? 