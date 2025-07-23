import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { CreateEmergencyAlertDto } from './dto/create-emergency-alert.dto';
import { EmergencyContactResponseDto } from './dto/emergency-contact-response.dto';
import { EmergencyAlertResponseDto } from './dto/emergency-alert-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveInterface } from 'src/common/interfaces/user-active.interface';

@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  // ===== CONTACTOS DE EMERGENCIA =====

  @Post('contacts')
  async createEmergencyContact(
    @ActiveUser() user: UserActiveInterface,
    @Body() createEmergencyContactDto: CreateEmergencyContactDto,
  ): Promise<EmergencyContactResponseDto> {
    return this.emergencyService.createEmergencyContact(
      user.id,
      createEmergencyContactDto,
    );
  }

  @Get('contacts')
  async findAllEmergencyContacts(
    @ActiveUser() user: UserActiveInterface,
  ): Promise<EmergencyContactResponseDto[]> {
    return this.emergencyService.findAllEmergencyContacts(user.id);
  }

  @Get('contacts/:id')
  async findOneEmergencyContact(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<EmergencyContactResponseDto> {
    return this.emergencyService.findOneEmergencyContact(+id, user.id);
  }

  @Patch('contacts/:id')
  async updateEmergencyContact(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
    @Body() updateEmergencyContactDto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContactResponseDto> {
    return this.emergencyService.updateEmergencyContact(
      +id,
      user.id,
      updateEmergencyContactDto,
    );
  }

  @Patch('contacts/:id/fcm-token')
  async updateContactFCMToken(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
    @Body() body: { fcmToken: string },
  ): Promise<EmergencyContactResponseDto> {
    return this.emergencyService.updateEmergencyContact(
      +id,
      user.id,
      { fcmToken: body.fcmToken },
    );
  }

  @Delete('contacts/:id')
  async removeEmergencyContact(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<{ message: string }> {
    await this.emergencyService.removeEmergencyContact(+id, user.id);
    return { message: 'Contacto de emergencia eliminado exitosamente' };
  }

  // ===== ALERTAS DE EMERGENCIA =====

  @Post('alerts')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        location: { type: 'string' },
        type: { type: 'string', enum: ['panic_button', 'automatic_detection', 'manual_trigger'] },
        metadata: { type: 'string' },
        video: {
          type: 'string',
          format: 'binary',
        },
        audio: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async createEmergencyAlert(
    @ActiveUser() user: UserActiveInterface,
    @Body() createEmergencyAlertDto: CreateEmergencyAlertDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: 'video/*' }),
        ],
        fileIsRequired: false,
      }),
    )
    videoFile?: Express.Multer.File,
  ): Promise<EmergencyAlertResponseDto> {
    return this.emergencyService.createEmergencyAlert(
      user.id,
      createEmergencyAlertDto,
      videoFile,
    );
  }

  @Post('alerts/panic-button')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        location: { type: 'string' },
        metadata: { type: 'string' },
        video: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async triggerPanicButton(
    @ActiveUser() user: UserActiveInterface,
    @Body() createEmergencyAlertDto: CreateEmergencyAlertDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: 'video/*' }),
        ],
        fileIsRequired: false,
      }),
    )
    videoFile?: Express.Multer.File,
  ): Promise<EmergencyAlertResponseDto> {
    // Forzar tipo de alerta como panic_button
    const alertData = {
      ...createEmergencyAlertDto,
      type: 'panic_button' as any,
    };

    return this.emergencyService.createEmergencyAlert(
      user.id,
      alertData,
      videoFile,
    );
  }

  @Get('alerts')
  async findAllEmergencyAlerts(
    @ActiveUser() user: UserActiveInterface,
  ): Promise<EmergencyAlertResponseDto[]> {
    return this.emergencyService.findAllEmergencyAlerts(user.id);
  }

  @Get('alerts/:id')
  async findOneEmergencyAlert(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<EmergencyAlertResponseDto> {
    return this.emergencyService.findOneEmergencyAlert(+id, user.id);
  }

  @Patch('alerts/:id/resolve')
  async resolveEmergencyAlert(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
    @Body() body: { resolutionNotes?: string },
  ): Promise<EmergencyAlertResponseDto> {
    return this.emergencyService.resolveEmergencyAlert(
      +id,
      user.id,
      body.resolutionNotes,
    );
  }

  @Patch('alerts/:id/false-alarm')
  async markAsFalseAlarm(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
    @Body() body: { resolutionNotes?: string },
  ): Promise<EmergencyAlertResponseDto> {
    return this.emergencyService.markAsFalseAlarm(
      +id,
      user.id,
      body.resolutionNotes,
    );
  }

  // ===== ESTADÍSTICAS =====

  @Get('stats')
  async getEmergencyStats(@ActiveUser() user: UserActiveInterface) {
    return this.emergencyService.getEmergencyStats(user.id);
  }

  // ===== SERVICIOS DE NOTIFICACIÓN =====

  @Get('notification-services/status')
  async getNotificationServicesStatus() {
    return this.emergencyService.getNotificationServicesStatus();
  }
} 