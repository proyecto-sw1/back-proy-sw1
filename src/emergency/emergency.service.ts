import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { EmergencyAlert, AlertStatus, AlertType } from './entities/emergency-alert.entity';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { CreateEmergencyAlertDto } from './dto/create-emergency-alert.dto';
import { AwsS3Service } from 'src/common/services/aws-s3.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { EmergencyNotificationService } from 'src/common/services/emergency-notification.service';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class EmergencyService {
  constructor(
    @InjectRepository(EmergencyContact)
    private emergencyContactRepository: Repository<EmergencyContact>,
    @InjectRepository(EmergencyAlert)
    private emergencyAlertRepository: Repository<EmergencyAlert>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private awsS3Service: AwsS3Service,
    private notificationsGateway: NotificationsGateway,
    private emergencyNotificationService: EmergencyNotificationService,
  ) {}

  // ===== CONTACTOS DE EMERGENCIA =====

  async createEmergencyContact(
    userId: number,
    createEmergencyContactDto: CreateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    // Verificar límite de contactos (máximo 5)
    const existingContacts = await this.emergencyContactRepository.count({
      where: { userId, isActive: true },
    });

    if (existingContacts >= 5) {
      throw new BadRequestException('Ya tienes el máximo de 5 contactos de emergencia');
    }

    const contact = this.emergencyContactRepository.create({
      ...createEmergencyContactDto,
      userId,
    });

    return this.emergencyContactRepository.save(contact);
  }

  async findAllEmergencyContacts(userId: number): Promise<EmergencyContact[]> {
    return this.emergencyContactRepository.find({
      where: { userId, isActive: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOneEmergencyContact(id: number, userId: number): Promise<EmergencyContact> {
    const contact = await this.emergencyContactRepository.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contacto de emergencia no encontrado');
    }

    return contact;
  }

  async updateEmergencyContact(
    id: number,
    userId: number,
    updateEmergencyContactDto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    const contact = await this.findOneEmergencyContact(id, userId);

    Object.assign(contact, updateEmergencyContactDto);
    return this.emergencyContactRepository.save(contact);
  }

  async removeEmergencyContact(id: number, userId: number): Promise<void> {
    const contact = await this.findOneEmergencyContact(id, userId);
    await this.emergencyContactRepository.softDelete(id);
  }

  // ===== ALERTAS DE EMERGENCIA =====

  async createEmergencyAlert(
    userId: number,
    createEmergencyAlertDto: CreateEmergencyAlertDto,
    videoFile?: Express.Multer.File,
    audioFile?: Express.Multer.File,
  ): Promise<EmergencyAlert> {
    let videoUrl: string | undefined;
    let audioUrl: string | undefined;
    let duration = 0;

    // Subir archivos a S3 si se proporcionan
    if (videoFile) {
      videoUrl = await this.awsS3Service.uploadFile(videoFile, 'emergency-videos');
      // Aquí podrías extraer la duración del video si es necesario
      duration = 300; // 5 minutos por defecto
    }

    if (audioFile) {
      audioUrl = await this.awsS3Service.uploadFile(audioFile, 'emergency-audio');
    }

    const alert = this.emergencyAlertRepository.create({
      ...createEmergencyAlertDto,
      userId,
      videoUrl,
      audioUrl,
      duration,
      type: createEmergencyAlertDto.type || AlertType.PANIC_BUTTON,
    });

    const savedAlert = await this.emergencyAlertRepository.save(alert);

    // Notificar a contactos de emergencia
    await this.notifyEmergencyContacts(userId, savedAlert);

    return savedAlert;
  }

  async findAllEmergencyAlerts(userId: number): Promise<EmergencyAlert[]> {
    return this.emergencyAlertRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneEmergencyAlert(id: number, userId: number): Promise<EmergencyAlert> {
    const alert = await this.emergencyAlertRepository.findOne({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alerta de emergencia no encontrada');
    }

    return alert;
  }

  async resolveEmergencyAlert(
    id: number,
    userId: number,
    resolutionNotes?: string,
  ): Promise<EmergencyAlert> {
    const alert = await this.findOneEmergencyAlert(id, userId);

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = resolutionNotes;

    return this.emergencyAlertRepository.save(alert);
  }

  async markAsFalseAlarm(
    id: number,
    userId: number,
    resolutionNotes?: string,
  ): Promise<EmergencyAlert> {
    const alert = await this.findOneEmergencyAlert(id, userId);

    alert.status = AlertStatus.FALSE_ALARM;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = resolutionNotes;

    return this.emergencyAlertRepository.save(alert);
  }

  // ===== NOTIFICACIONES A CONTACTOS =====

  private async notifyEmergencyContacts(userId: number, alert: EmergencyAlert): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const contacts = await this.findAllEmergencyContacts(userId);

    if (!user || contacts.length === 0) {
      return;
    }

    // Enviar notificación a cada contacto por múltiples canales
    for (const contact of contacts) {
      // 1. WebSocket (tiempo real)
      await this.notificationsGateway.notificarAlertaEmergencia(
        contact,
        user,
        alert,
      );

      // 2. Otros canales (SMS, Email, Push) - implementación futura
      await this.emergencyNotificationService.sendEmergencyNotification(
        {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          fcmToken: contact.fcmToken,
          // apnsToken se agregaría en el futuro si es necesario
        },
        {
          id: alert.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          type: alert.type,
          description: alert.description,
          location: alert.location,
          latitude: alert.latitude,
          longitude: alert.longitude,
          videoUrl: alert.videoUrl,
          audioUrl: alert.audioUrl,
          duration: alert.duration,
          metadata: alert.metadata,
          createdAt: alert.createdAt,
        },
      );
    }
  }

  // ===== ESTADÍSTICAS =====

  async getEmergencyStats(userId: number): Promise<any> {
    const totalAlerts = await this.emergencyAlertRepository.count({
      where: { userId },
    });

    const activeAlerts = await this.emergencyAlertRepository.count({
      where: { userId, status: AlertStatus.ACTIVE },
    });

    const resolvedAlerts = await this.emergencyAlertRepository.count({
      where: { userId, status: AlertStatus.RESOLVED },
    });

    const falseAlarms = await this.emergencyAlertRepository.count({
      where: { userId, status: AlertStatus.FALSE_ALARM },
    });

    const totalContacts = await this.emergencyContactRepository.count({
      where: { userId, isActive: true },
    });

    return {
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      falseAlarms,
      totalContacts,
      contactsRemaining: 5 - totalContacts,
    };
  }

  // ===== SERVICIOS DE NOTIFICACIÓN =====

  async getNotificationServicesStatus(): Promise<any> {
    const servicesStatus = await this.emergencyNotificationService.checkNotificationServices();
    
    return {
      services: servicesStatus,
      summary: {
        websocket: true, // Siempre disponible
        sms: servicesStatus.sms,
        email: servicesStatus.email,
        pushAndroid: servicesStatus.fcm,
        pushIOS: servicesStatus.apns,
      },
      message: 'WebSocket siempre disponible. Otros servicios requieren configuración adicional.',
    };
  }
} 