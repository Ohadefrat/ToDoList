const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with improved options
// Use 127.0.0.1 instead of localhost to force IPv4 (avoids IPv6 ::1 issues on Windows)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/angular-nodejs-app';

const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
  socketTimeoutMS: 45000,
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    const dbName = MONGODB_URI.includes('@')
      ? MONGODB_URI.split('/').pop()?.split('?')[0]
      : MONGODB_URI.split('/').pop();
    console.log(`📊 Database: ${dbName}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('\n📝 Troubleshooting steps:');
    console.error('1. Make sure MongoDB is running (check services.msc or run: net start MongoDB)');
    console.error('2. Verify connection string in .env file');
    console.error('3. For MongoDB Atlas, check your IP whitelist and credentials');
    console.error('4. Default connection: mongodb://localhost:27017/angular-nodejs-app\n');
    // Don't exit - let server start but operations will fail gracefully
  });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Make io available to routes
app.set('io', io);

// API routes
app.use('/api/auth', require('./routes/auth')); // Authentication routes (no auth required)
app.use('/api/tasks', require('./routes/tasks')); // Task routes (auth required)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Note: Auto-unlock happens via timeout mechanism
  });
});

// Periodic cleanup: Auto-unlock tasks locked for more than 5 minutes
setInterval(async () => {
  try {
    const Task = require('./models/Task');
    const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const expiredTime = new Date(Date.now() - LOCK_TIMEOUT);

    // Find tasks with expired locks
    const expiredTasks = await Task.find({
      lockedBy: { $ne: null },
      lockedAt: { $lt: expiredTime }
    }).select('_id').exec();

    if (expiredTasks.length > 0) {
      const taskIds = expiredTasks.map(t => t._id);

      // Unlock expired tasks
      await Task.updateMany(
        { _id: { $in: taskIds } },
        {
          $set: {
            lockedBy: null,
            lockedAt: null
          }
        }
      );

      console.log(`Auto-unlocked ${expiredTasks.length} expired task lock(s)`);

      // Emit unlock events for all unlocked tasks
      taskIds.forEach(taskId => {
        io.emit('task:unlocked', { id: taskId });
      });
    }
  } catch (error) {
    console.error('Error in auto-unlock cleanup:', error);
  }
}, 60000); // Run every minute

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
