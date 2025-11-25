const express = require('express');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const ChatSocketHandler = require('./socket/ChatSocketHandler');
const ChannelSocketHandler = require('./socket/ChannelSocketHandler');
const PlaylistSocketHandler = require('./socket/PlaylistSocketHandler');
const socketAuthMiddleware = require('./socket/middleware/jwt');

const proxyController = require('./controllers/ProxyController');
const centralChannelController = require('./controllers/CentralChannelController');
const channelController = require('./controllers/ChannelController');
const authController = require('./controllers/AuthController');
const userController = require('./controllers/UserController');
const streamController = require('./services/restream/StreamController');
const ChannelService = require('./services/ChannelService');
const PlaylistUpdater = require('./services/PlaylistUpdater');

dotenv.config();

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth routes (public - no token required)
const authRouter = express.Router();
authRouter.post('/login', authController.login);
authRouter.get('/status', authController.checkAuthStatus);
app.use('/api/auth', authRouter);

// User routes (protected - authentication required)
const userRouter = express.Router();
userRouter.use(authController.verifyToken); // All user routes require authentication
userRouter.get('/me', userController.getCurrentUser);
userRouter.get('/', authController.verifyAdmin, userController.getAllUsers);
userRouter.get('/stats', authController.verifyAdmin, userController.getUserStats);
userRouter.get('/:id', userController.getUserById);
userRouter.post('/', authController.verifyAdmin, userController.createUser);
userRouter.put('/:id', userController.updateUser); // Users can update themselves, admins can update anyone
userRouter.delete('/:id', authController.verifyAdmin, userController.deleteUser);
app.use('/api/users', userRouter);

// Channel routes (all protected - authentication required)
const apiRouter = express.Router();
apiRouter.use(authController.verifyToken); // All channel routes require authentication
apiRouter.get('/', channelController.getChannels);
apiRouter.get('/current', channelController.getCurrentChannel);
apiRouter.get('/playlist', centralChannelController.playlist);
apiRouter.get('/:channelId', channelController.getChannel);
// Admin-only channel management
apiRouter.delete('/clear', authController.verifyAdmin, channelController.clearChannels);
apiRouter.delete('/:channelId', authController.verifyAdmin, channelController.deleteChannel);
apiRouter.put('/:channelId', authController.verifyAdmin, channelController.updateChannel);
apiRouter.post('/', authController.verifyAdmin, channelController.addChannel);
app.use('/api/channels', apiRouter);

// Proxy routes (protected - authentication required)
const proxyRouter = express.Router();
proxyRouter.use(authController.verifyToken); // All proxy routes require authentication
proxyRouter.get('/channel', proxyController.channel);
proxyRouter.get('/segment', proxyController.segment);
proxyRouter.get('/key', proxyController.key);
proxyRouter.get('/current', centralChannelController.currentChannel);
app.use('/proxy', proxyRouter);


const PORT = 5000;
const server = app.listen(PORT, async () => {
  console.log(`Server listening on Port ${PORT}`);
  // Ya no iniciamos FFmpeg automáticamente - cada usuario maneja su canal
  PlaylistUpdater.startScheduler();
  PlaylistUpdater.registerChannelsPlaylist(ChannelService.getChannels());
});


// Web Sockets with explicit CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin in development
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  },
});

// Add JWT authentication middleware to socket.io
io.use(socketAuthMiddleware);

const connectedUsers = {};

io.on('connection', socket => {
  console.log('New client connected');

  socket.on('new-user', userId => {
    connectedUsers[socket.id] = userId;
    socket.broadcast.emit('user-connected', userId);
  })

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', connectedUsers[socket.id]);
    delete connectedUsers[socket.id];
  })

  ChannelSocketHandler(io, socket);
  PlaylistSocketHandler(io, socket);
  ChatSocketHandler(io, socket);
})