import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3003", 10);

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(handler)

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://yourdomain.com"] 
        : ["http://localhost:3000"],
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join room
    socket.on('join-room', (room) => {
      socket.join(room)
      socket.to(room).emit('user-joined', { userId: socket.id })
      console.log(`Socket ${socket.id} joined room: ${room}`)
    })

    // Handle messages
    socket.on('send-message', (data) => {
      const { room, message, timestamp } = data
      io.to(room).emit('receive-message', {
        message,
        timestamp,
        userId: socket.id
      })
    })

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.room).emit('user-typing', {
        userId: socket.id,
        isTyping: data.isTyping
      })
    })

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason)
    })

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  // Graceful error handling
  process.on('SIGINT', () => {
    console.log('Shutting down server...')
    io.close()
    httpServer.close(() => {
      process.exit(0)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})