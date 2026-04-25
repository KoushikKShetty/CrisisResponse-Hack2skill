import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './services/socketService';
import authRoutes from './routes/auth';
import staffRoutes from './routes/staff';
import zonesRoutes from './routes/zones';
import incidentsRoutes from './routes/incidents';
import guestRoutes from './routes/guest';
import chatRoutes from './routes/chat';
import mockRoutes from './routes/mock';
import { startHeartbeatMonitor } from './services/heartbeatMonitor';
import { startEscalationMonitor } from './services/escalationMonitor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/staff', staffRoutes);
app.use('/zones', zonesRoutes);
app.use('/incidents', incidentsRoutes);
app.use('/guest', guestRoutes);
app.use('/chat', chatRoutes);
app.use('/mock', mockRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start background jobs
startHeartbeatMonitor();
startEscalationMonitor();

// Start the HTTP and WebSocket server
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
