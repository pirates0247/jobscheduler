import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const orgSlug = client.handshake.query.orgSlug as string;
    if (orgSlug) {
      client.join(`org:${orgSlug}`);
      this.logger.log(`Client ${client.id} joined room: org:${orgSlug}`);
    } else {
      this.logger.log(`Client ${client.id} connected globally`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emitJobCreated(orgSlug: string, data: any) {
    this.server.to(`org:${orgSlug}`).emit('job:created', data);
  }

  emitJobUpdated(orgSlug: string, data: any) {
    this.server.to(`org:${orgSlug}`).emit('job:updated', data);
  }

  emitQueueUpdated(data: any) {
    this.server.emit('queue:updated', data);
  }

  emitWorkerHeartbeat(data: any) {
    this.server.emit('worker:heartbeat', data);
  }

  emitMetricsUpdated(orgSlug: string, data: any) {
    this.server.to(`org:${orgSlug}`).emit('metrics:updated', data);
  }
}
