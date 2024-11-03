// Import necessary modules
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust as needed for security
    methods: ['GET', 'POST'],
  },
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());

// Store active sockets
const activeSockets = {};

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User sends their userId to register
  socket.on('registerUser', (userId) => {
    activeSockets[userId] = socket; // Store the socket associated with the userId
    console.log(`Socket ${socket.id} registered for user: ${userId}`);
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove the socket from activeSockets on disconnect
    for (const userId in activeSockets) {
      if (activeSockets[userId] === socket) {
        delete activeSockets[userId];
        console.log(`Socket ${socket.id} unregistered for user: ${userId}`);
        break;
      }
    }
  });

  // Handle pong responses from clients
  socket.on('pong', () => {
    console.log(`Pong received from ${socket.id}`);
  });
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const { userId, message } = req.body; // Assume payload includes userId and message
  console.log(`Webhook received for userId: ${userId}, message: ${message}`);

  // Check if the user is connected
  if (activeSockets[userId]) {
    const socket = activeSockets[userId]; // Get the user's socket

    // Emit data only to the specific user's room if they are connected
    socket.emit('webhookData', { message });
  } else {
    console.log(`User ${userId} is not connected.`);
  }

  // Respond to the webhook request
  res.status(200).send(`Webhook processed for user ${userId}`);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Heartbeat mechanism
setInterval(() => {
  Object.keys(activeSockets).forEach(userId => {
    const socket = activeSockets[userId];
    if (socket) {
      socket.emit('ping'); // Sending a ping message
      console.log(`Ping sent to user: ${userId}`);

      // Setup a timeout to check for pong response
      const pongTimeout = setTimeout(() => {
        console.log(`No pong response from ${userId}, disconnecting socket.`);
        socket.disconnect(); // Disconnect socket if no pong received
      }, 5000); // 5 seconds to wait for pong response

      // Clear timeout when pong is received
      socket.on('pong', () => {
        console.log(`Pong received from ${userId}`);
        clearTimeout(pongTimeout); // Clear the timeout if pong is received
      });
    }
  });
}, 300000); // Send a ping every 5 minutes (300000 milliseconds)



// // Import necessary modules
// import express from 'express';
// import http from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';

// // Initialize Express and HTTP server
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // Adjust as needed for security
//     methods: ['GET', 'POST']
//   }
// });

// // Middleware to parse JSON requests
// app.use(express.json());
// app.use(cors());

// // Socket connection handler
// io.on('connection', (socket) => {
//   console.log('New client connected:', socket.id);

//   // User sends their userId to join a specific room
//   socket.on('registerUser', (userId) => {
//     socket.join(userId); // Join a room named after the userId
//     console.log(`Socket ${socket.id} joined room: ${userId}`);
//   });

//   // Handle socket disconnection
//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', socket.id);
//   });
// });

// // Webhook endpoint
// app.post('/webhook', (req, res) => {
//   const { userId, message } = req.body; // Assume payload includes userId and message
//   console.log(`Webhook received for userId: ${userId}, message: ${message}`);
//   socket.join(userId); // Join a room named after
//   // Emit data only to the specific user's room if they are connected
//   io.to(userId).emit('webhookData', { message });

//   // Respond to the webhook request
//   res.status(200).send(`Webhook processed for user ${userId}`);
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
 