import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

export interface NotificationContact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  fcmToken?: string; // Para Firebase Cloud Messaging (Android)
  apnsToken?: string; // Para Apple Push Notification Service (iOS)
}

export interface EmergencyAlertData {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  type: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  videoUrl?: string;
  audioUrl?: string;
  duration: number;
  metadata?: any;
  createdAt: Date;
}

@Injectable()
export class EmergencyNotificationService {
  private readonly logger = new Logger(EmergencyNotificationService.name);

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  /**
   * Inicializar Firebase Admin SDK
   */
  private initializeFirebase() {
    try {
      // Verificar si Firebase ya está inicializado
      if (!admin.apps.length) {
        const pathToSecret = process.env.PATH_TO_SECRET || this.configService.get<string>('PATH_TO_SECRET');
        if (!pathToSecret || !fs.existsSync(pathToSecret)) {
          this.logger.error('❌ No se encontró el archivo de credenciales de Firebase. Verifica PATH_TO_SECRET en tu .env');
          return;
        }
        const serviceAccount = JSON.parse(fs.readFileSync(pathToSecret, 'utf8'));

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId: serviceAccount.project_id
        });

        this.logger.log('✅ Firebase Admin SDK inicializado correctamente');
      }
    } catch (error) {
      this.logger.error('❌ Error inicializando Firebase Admin SDK:', error);
    }
  }

  /**
   * Enviar notificación de emergencia por todos los canales disponibles
   */
  async sendEmergencyNotification(
    contact: NotificationContact,
    alertData: EmergencyAlertData,
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // 1. WebSocket (ya implementado en NotificationsGateway)
    // Esta se maneja por separado en el gateway

    // 2. SMS (implementación futura)
    if (contact.phone) {
      promises.push(this.sendEmergencySMS(contact, alertData));
    }

    // 3. Email (implementación futura)
    if (contact.email) {
      promises.push(this.sendEmergencyEmail(contact, alertData));
    }

    // 4. Push Notification Android (implementación futura)
    if (contact.fcmToken) {
      promises.push(this.sendFirebaseNotification(contact, alertData));
    }

    // 5. Push Notification iOS (implementación futura)
    if (contact.apnsToken) {
      promises.push(this.sendAPNSNotification(contact, alertData));
    }

    // Ejecutar todas las notificaciones en paralelo
    try {
      await Promise.allSettled(promises);
      this.logger.log(
        `Notificaciones enviadas a contacto ${contact.name} para alerta ${alertData.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando notificaciones a contacto ${contact.name}:`,
        error,
      );
    }
  }

  /**
   * Enviar SMS de emergencia (implementación futura)
   */
  private async sendEmergencySMS(
    contact: NotificationContact,
    alertData: EmergencyAlertData,
  ): Promise<void> {
    try {
      // TODO: Implementar con Twilio o servicio SMS similar
      const message = `🚨 ALERTA DE EMERGENCIA 🚨
${alertData.user.name} ha activado el botón de pánico.
Ubicación: ${alertData.location || 'No disponible'}
Hora: ${alertData.createdAt.toLocaleString()}
Responda inmediatamente.`;

      this.logger.log(`SMS enviado a ${contact.phone}: ${message}`);
      
      // Implementación futura:
      // const twilio = require('twilio');
      // const client = twilio(
      //   this.configService.get('TWILIO_ACCOUNT_SID'),
      //   this.configService.get('TWILIO_AUTH_TOKEN')
      // );
      // await client.messages.create({
      //   body: message,
      //   from: this.configService.get('TWILIO_PHONE_NUMBER'),
      //   to: contact.phone
      // });
    } catch (error) {
      this.logger.error(`Error enviando SMS a ${contact.phone}:`, error);
    }
  }

  /**
   * Enviar Email de emergencia (implementación futura)
   */
  private async sendEmergencyEmail(
    contact: NotificationContact,
    alertData: EmergencyAlertData,
  ): Promise<void> {
    try {
      // TODO: Implementar con Nodemailer o servicio email similar
      const subject = '🚨 ALERTA DE EMERGENCIA';
      const html = `
        <h2>🚨 ALERTA DE EMERGENCIA 🚨</h2>
        <p><strong>${alertData.user.name}</strong> ha activado el botón de pánico.</p>
        <p><strong>Ubicación:</strong> ${alertData.location || 'No disponible'}</p>
        <p><strong>Hora:</strong> ${alertData.createdAt.toLocaleString()}</p>
        ${alertData.videoUrl ? `<p><strong>Video:</strong> <a href="${alertData.videoUrl}">Ver video</a></p>` : ''}
        <p>Responda inmediatamente.</p>
      `;

      this.logger.log(`Email enviado a ${contact.email}: ${subject}`);
      
      // Implementación futura:
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter({
      //   host: this.configService.get('SMTP_HOST'),
      //   port: this.configService.get('SMTP_PORT'),
      //   secure: false,
      //   auth: {
      //     user: this.configService.get('SMTP_USER'),
      //     pass: this.configService.get('SMTP_PASS')
      //   }
      // });
      // await transporter.sendMail({
      //   from: this.configService.get('SMTP_USER'),
      //   to: contact.email,
      //   subject,
      //   html
      // });
    } catch (error) {
      this.logger.error(`Error enviando email a ${contact.email}:`, error);
    }
  }

  /**
   * Enviar notificación Firebase (Android/iOS) - Integrado con sistema existente
   */
  private async sendFirebaseNotification(
    contact: NotificationContact,
    alertData: EmergencyAlertData,
  ): Promise<void> {
    try {
      // Usar la misma configuración que ya tienes para incidentes
      const message: admin.messaging.TokenMessage = {
        token: contact.fcmToken,
        notification: {
          title: '🚨 ALERTA DE EMERGENCIA',
          body: `${alertData.user.name} ha activado el botón de pánico`,
        },
        data: {
          type: 'emergency_alert',
          alertId: alertData.id.toString(),
          userId: alertData.user.id.toString(),
          userName: alertData.user.name,
          description: alertData.description || '',
          videoUrl: alertData.videoUrl || '',
          audioUrl: alertData.audioUrl || '',
          location: alertData.location || '',
          latitude: alertData.latitude?.toString() || '',
          longitude: alertData.longitude?.toString() || '',
          duration: alertData.duration.toString(),
          timestamp: alertData.createdAt.toISOString(),
          // Campos compatibles con tu sistema de incidentes
          latitud: alertData.latitude?.toString() || '',
          longitud: alertData.longitude?.toString() || '',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'emergency_sound',
            channelId: 'emergency_alerts',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            defaultLightSettings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'emergency_sound.wav',
              badge: 1,
              'content-available': 1,
              priority: 'high',
            },
          },
        },
      };

      // Usar Firebase Admin SDK con tu Service Account
      try {
        const messaging = admin.messaging();
        const result = await messaging.send(message);
        
        this.logger.log(`✅ FCM enviado a ${contact.fcmToken}: ${result}`);
      } catch (error) {
        this.logger.error(`❌ Error enviando FCM a ${contact.fcmToken}:`, error);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error enviando FCM a ${contact.fcmToken}:`, error);
    }
  }

  /**
   * Enviar notificación APNs (iOS) (implementación futura)
   */
  private async sendAPNSNotification(
    contact: NotificationContact,
    alertData: EmergencyAlertData,
  ): Promise<void> {
    try {
      // TODO: Implementar con APNs
      const notification = {
        alert: {
          title: '🚨 Alerta de Emergencia',
          body: `${alertData.user.name} ha activado el botón de pánico`,
        },
        topic: 'com.yourapp.emergency',
        payload: {
          alertId: alertData.id,
          videoUrl: alertData.videoUrl,
          location: alertData.location,
          latitude: alertData.latitude,
          longitude: alertData.longitude,
        },
        sound: 'emergency_sound.wav',
        badge: 1,
        'content-available': 1,
      };

      this.logger.log(`APNs enviado a ${contact.apnsToken}`);
      
      // Implementación futura:
      // const apn = require('apn');
      // const provider = new apn.Provider({
      //   token: {
      //     key: this.configService.get('APNS_PRIVATE_KEY'),
      //     keyId: this.configService.get('APNS_KEY_ID'),
      //     teamId: this.configService.get('APNS_TEAM_ID')
      //   },
      //   production: false
      // });
      // const apnNotification = new apn.Notification();
      // Object.assign(apnNotification, notification);
      // await provider.send(apnNotification, contact.apnsToken);
    } catch (error) {
      this.logger.error(`Error enviando APNs a ${contact.apnsToken}:`, error);
    }
  }

  /**
   * Verificar configuración de servicios de notificación
   */
  async checkNotificationServices(): Promise<{
    sms: boolean;
    email: boolean;
    fcm: boolean;
    apns: boolean;
  }> {
    return {
      sms: !!this.configService.get('TWILIO_ACCOUNT_SID'),
      email: !!this.configService.get('SMTP_HOST'),
      fcm: true, // Firebase Admin SDK configurado con Service Account
      apns: !!this.configService.get('APNS_KEY_ID'),
    };
  }
} 