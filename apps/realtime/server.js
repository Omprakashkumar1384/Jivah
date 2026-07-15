require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const PORT = process.env.PORT || 4000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || 'http://localhost:3001';

const app = express();
app.use(cors({ origin: DASHBOARD_ORIGIN }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'jivah-realtime' });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: DASHBOARD_ORIGIN },
});

// Redis subscriber — listens for events published by the backend
const subscriber = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

subscriber.subscribe('queue-updates', (err) => {
  if (err) {
    console.error('Failed to subscribe to queue-updates:', err);
  } else {
    console.log('Subscribed to Redis channel: queue-updates');
  }
});

subscriber.on('message', (channel, message) => {
  if (channel !== 'queue-updates') return;

  try {
    const payload = JSON.parse(message);
    // payload = { hospitalId, appointmentId, patientId, status, queuePosition }

    // Broadcast to anyone listening for this specific appointment
    if (payload.appointmentId) {
      io.to(`appointment:${payload.appointmentId}`).emit('queue-update', payload);
    }

    // Broadcast to the hospital's dashboard room (e.g., for doctor/staff live views)
    if (payload.hospitalId) {
      io.to(`hospital:${payload.hospitalId}`).emit('queue-update', payload);
    }

    console.log('Broadcasted queue-update:', payload);
  } catch (err) {
    console.error('Invalid message on queue-updates channel:', message);
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Client tells us what they want to listen to
  socket.on('subscribe:appointment', (appointmentId) => {
    socket.join(`appointment:${appointmentId}`);
  });

  socket.on('subscribe:hospital', (hospitalId) => {
    socket.join(`hospital:${hospitalId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Jivah realtime service running on port ${PORT}`);
});
