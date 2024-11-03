import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { trackEmailOpen } from './controllers/emailController.js';
import compression from 'compression';
import http from 'http';  // Import http
import { Server } from 'socket.io'; // Import socket.io


dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3001', // Adjust to your frontend URL
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:3001', // Replace with your frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true
};

export const activeSockets = {}; // Store active sockets

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.use(express.json());

// New WebSocket logic starts here

// Socket connection handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User sends their userId to register
    socket.on('registerUser', (userId) => {
        activeSockets[userId] = socket; // Store the socket associated with the userId
        
        console.log(`Socket ${socket.id} registered for user: ${userId}`);
        console.log('Active sockets:', activeSockets);
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

// Add your existing routes and middleware
app.get('/', (req, res) => {
    res.send('Welcome to the Email Tracking API');
});

// Pass corsOptions to authRoutes
app.use('/auth', authRoutes(corsOptions));

// Add CORS for tracking pixel
app.use('/auth/track', cors(corsOptions));

// Add compression middleware
app.use(compression());

const PORT = process.env.PORT || 3000;
// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



// // server.js
// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import authRoutes from './routes/auth.js';
// import { trackEmailOpen } from './controllers/emailController.js';
// import compression from 'compression';

// dotenv.config();

// const app = express();

// // CORS configuration
// const corsOptions = {
//     origin: 'http://localhost:3001', // Replace with your frontend URL
//     methods: ['GET', 'POST', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
//     credentials: true
// };
// // const express = require('express');
// // const cors = require('cors');
// // require('dotenv').config();
// // const authRoutes = require('./routes/auth.js');
// // const { trackEmailOpen } = require('./controllers/emailController');
// // const compression = require('compression');

// // const app = express();

// // // CORS configuration
// // const corsOptions = {
// //     origin: 'http://localhost:3001', // Replace with your frontend URL
// //     methods: ['GET', 'POST', 'OPTIONS'],
// //     allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
// //     credentials: true
// // };




// // Apply CORS middleware to all routes
// app.use(cors(corsOptions));

// // Add this middleware to log incoming requests
// app.use((req, res, next) => {
//     console.log(`Received ${req.method} request for ${req.url}`);
//     console.log('Headers:', req.headers);
//     next();
// });

// app.use(express.json());

// // Add this new route handler before your other route definitions
// app.get('/', (req, res) => {
//     res.send('Welcome to the Email Tracking API');
// });

// // Pass corsOptions to authRoutes
// app.use('/auth', authRoutes(corsOptions));

// // Add CORS for tracking pixel
// app.use('/auth/track', cors(corsOptions));

// // Add compression middleware
// app.use(compression());

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// // Remove these lines if they exist, as they're now handled in auth.js
// // app.get('/auth/track/:trackingId', cors(corsOptions), trackEmailOpen);
// // app.post('/auth/track/:trackingId', cors(corsOptions), trackEmailOpen);

// // Add this before your routes
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
//     res.header('Access-Control-Allow-Credentials', 'true');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning');
//     if (req.method === 'OPTIONS') {
//         return res.sendStatus(200);
//     }
//     next();
// });
