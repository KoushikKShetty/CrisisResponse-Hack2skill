import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { db } from '../utils/firebase';
import { ChatMessage, ChatMessageType } from '../../../shared/types';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crisis-responder-secret';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const chatNamespace = io.of('/chat');

  // Middleware for auth
  chatNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // For local dev, allow bypass if token starts with 'mock_'
    if (token.startsWith('mock_')) {
      (socket as any).userId = token.replace('mock_', '');
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 User connected to /chat: ${userId}`);

    socket.on('join-incident', async (incidentId: string) => {
      socket.join(incidentId);
      console.log(`User ${userId} joined room ${incidentId}`);
      
      // Fetch history and emit to the user
      try {
        const messagesSnap = await db.ref(`chat/${incidentId}`).orderByChild('timestamp').limitToLast(50).once('value');
        const messagesData = messagesSnap.val() || {};
        const messages: ChatMessage[] = Object.values(messagesData);
        messages.sort((a, b) => a.timestamp - b.timestamp);
        socket.emit('history', messages);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    });

    socket.on('send-message', async (data: { incidentId: string; text: string; type?: ChatMessageType }) => {
      const { incidentId, text, type = 'message' } = data;
      const messageId = `msg_${Date.now()}`;
      
      const message: ChatMessage = {
        id: messageId,
        incidentId,
        userId,
        text,
        timestamp: Date.now(),
        type
      };

      // Persist to DB
      try {
        await db.ref(`chat/${incidentId}/${messageId}`).set(message);
        
        // Broadcast to everyone in the room
        chatNamespace.to(incidentId).emit('new-message', message);
        
        // Handle escalation triggers
        if (type === 'escalation') {
          handleEscalation(incidentId, userId);
        }
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    socket.on('typing', (data: { incidentId: string, isTyping: boolean }) => {
      socket.to(data.incidentId).emit('user-typing', { userId, isTyping: data.isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected from /chat: ${userId}`);
    });
  });
};

const handleEscalation = async (incidentId: string, escalatedBy: string) => {
  try {
    await db.ref(`incidents/${incidentId}`).update({
      severity: 'critical',
      escalatedAt: Date.now()
    });
    // System message about escalation
    const sysMsgId = `sys_${Date.now()}`;
    const sysMsg: ChatMessage = {
      id: sysMsgId,
      incidentId,
      userId: 'system',
      text: `Incident escalated by user ${escalatedBy}`,
      timestamp: Date.now(),
      type: 'system'
    };
    await db.ref(`chat/${incidentId}/${sysMsgId}`).set(sysMsg);
    io.of('/chat').to(incidentId).emit('new-message', sysMsg);
  } catch (err) {
    console.error('Failed to escalate:', err);
  }
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
