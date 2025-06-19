import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface UserSocket {
  userId: number;
  socket: Socket;
}

interface NotificationPayload {
  type: 'nuevo_comentario' | 'nueva_respuesta' | 'publicacion_aprobada' | 'publicacion_rechazada' | 'comentario_aprobado' | 'comentario_rechazado';
  data: any;
  timestamp: Date;
  recipientId: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers: Map<number, UserSocket[]> = new Map(); // Un usuario puede tener múltiples conexiones

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extraer token del handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Cliente intentó conectar sin token');
        client.disconnect();
        return;
      }

      // Verificar JWT
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.id;

      // Agregar usuario a la lista de conectados
      const userSockets = this.connectedUsers.get(userId) || [];
      userSockets.push({ userId, socket: client });
      this.connectedUsers.set(userId, userSockets);

      // Unir al usuario a su room personal
      client.join(`user_${userId}`);

      this.logger.log(`Usuario ${userId} conectado. Total conexiones: ${userSockets.length}`);

      // Enviar confirmación de conexión
      client.emit('connected', {
        message: 'Conectado al sistema de notificaciones',
        userId,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error en autenticación WebSocket:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Encontrar y remover el usuario de la lista de conectados
    for (const [userId, userSockets] of this.connectedUsers.entries()) {
      const filteredSockets = userSockets.filter(us => us.socket.id !== client.id);
      
      if (filteredSockets.length !== userSockets.length) {
        if (filteredSockets.length === 0) {
          this.connectedUsers.delete(userId);
        } else {
          this.connectedUsers.set(userId, filteredSockets);
        }
        
        this.logger.log(`Usuario ${userId} desconectado. Conexiones restantes: ${filteredSockets.length}`);
        break;
      }
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
  }

  /**
   * NOTIFICACIÓN: Nuevo comentario en publicación
   */
  async notificarNuevoComentario(publicacionId: number, autorPublicacionId: number, comentarioData: any) {
    const notification: NotificationPayload = {
      type: 'nuevo_comentario',
      data: {
        publicacion_id: publicacionId,
        comentario: {
          id_comentario: comentarioData.id_comentario,
          contenido_texto: comentarioData.contenido_texto,
          autor: {
            id: comentarioData.usuario.id,
            name: comentarioData.usuario.name,
          }
        }
      },
      timestamp: new Date(),
      recipientId: autorPublicacionId,
    };

    this.enviarNotificacionAUsuario(autorPublicacionId, notification);
    
    this.logger.log(`Notificación enviada: nuevo comentario en publicación ${publicacionId} para usuario ${autorPublicacionId}`);
  }

  /**
   * NOTIFICACIÓN: Nueva respuesta a comentario
   */
  async notificarNuevaRespuesta(comentarioPadreId: number, autorComentarioId: number, respuestaData: any) {
    const notification: NotificationPayload = {
      type: 'nueva_respuesta',
      data: {
        comentario_padre_id: comentarioPadreId,
        respuesta: {
          id_comentario: respuestaData.id_comentario,
          contenido_texto: respuestaData.contenido_texto,
          autor: {
            id: respuestaData.usuario.id,
            name: respuestaData.usuario.name,
          }
        }
      },
      timestamp: new Date(),
      recipientId: autorComentarioId,
    };

    this.enviarNotificacionAUsuario(autorComentarioId, notification);
    
    this.logger.log(`Notificación enviada: nueva respuesta al comentario ${comentarioPadreId} para usuario ${autorComentarioId}`);
  }

  /**
   * NOTIFICACIÓN: Publicación aprobada/rechazada por IA
   */
  async notificarEstadoPublicacion(publicacionId: number, autorId: number, estado: 'aprobado' | 'rechazado') {
    const notification: NotificationPayload = {
      type: estado === 'aprobado' ? 'publicacion_aprobada' : 'publicacion_rechazada',
      data: {
        publicacion_id: publicacionId,
        estado,
        mensaje: estado === 'aprobado' 
          ? 'Tu publicación ha sido aprobada y ya es visible para otros usuarios'
          : 'Tu publicación ha sido rechazada por no cumplir las políticas de contenido'
      },
      timestamp: new Date(),
      recipientId: autorId,
    };

    this.enviarNotificacionAUsuario(autorId, notification);
    
    this.logger.log(`Notificación enviada: publicación ${publicacionId} ${estado} para usuario ${autorId}`);
  }

  /**
   * NOTIFICACIÓN: Comentario aprobado/rechazado por IA
   */
  async notificarEstadoComentario(comentarioId: number, autorId: number, estado: 'aprobado' | 'rechazado') {
    const notification: NotificationPayload = {
      type: estado === 'aprobado' ? 'comentario_aprobado' : 'comentario_rechazado',
      data: {
        comentario_id: comentarioId,
        estado,
        mensaje: estado === 'aprobado' 
          ? 'Tu comentario ha sido aprobado y ya es visible'
          : 'Tu comentario ha sido rechazado por no cumplir las políticas de contenido'
      },
      timestamp: new Date(),
      recipientId: autorId,
    };

    this.enviarNotificacionAUsuario(autorId, notification);
    
    this.logger.log(`Notificación enviada: comentario ${comentarioId} ${estado} para usuario ${autorId}`);
  }

  /**
   * Enviar notificación a un usuario específico
   */
  private enviarNotificacionAUsuario(userId: number, notification: NotificationPayload) {
    const userSockets = this.connectedUsers.get(userId);
    
    if (userSockets && userSockets.length > 0) {
      // Enviar a todas las conexiones del usuario (puede estar en múltiples dispositivos)
      userSockets.forEach(userSocket => {
        userSocket.socket.emit('notification', notification);
      });
      
      this.logger.log(`Notificación enviada a usuario ${userId} en ${userSockets.length} dispositivo(s)`);
    } else {
      this.logger.log(`Usuario ${userId} no está conectado, notificación no enviada`);
      // Aquí podrías guardar en BD para notificaciones no leídas
    }
  }

  /**
   * Broadcast a todos los usuarios conectados
   */
  async broadcastToAll(type: string, data: any) {
    const notification = {
      type,
      data,
      timestamp: new Date(),
    };

    this.server.emit('broadcast', notification);
    this.logger.log(`Broadcast enviado: ${type}`);
  }

  /**
   * Obtener usuarios conectados (para debugging)
   */
  getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Obtener total de conexiones
   */
  getTotalConnections(): number {
    let total = 0;
    this.connectedUsers.forEach(sockets => total += sockets.length);
    return total;
  }
}