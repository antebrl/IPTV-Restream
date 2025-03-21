const express = require('express');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const ChatSocketHandler = require('./socket/ChatSocketHandler');
const ChannelSocketHandler = require('./socket/ChannelSocketHandler');

const proxyController = require('./controllers/ProxyController');
const centralChannelController = require('./controllers/CentralChannelController');
const channelController = require('./controllers/ChannelController');
const streamController = require('./services/restream/StreamController');
const ChannelService = require('./services/ChannelService');
const PlaylistSocketHandler = require('./socket/PlaylistSocketHandler');
const PlaylistUpdater = require('./services/PlaylistUpdater');

dotenv.config();

const app = express();
app.use(express.json());

const apiRouter = express.Router();
apiRouter.get('/', channelController.getChannels);
apiRouter.get('/current', channelController.getCurrentChannel);
apiRouter.delete('/clear', channelController.clearChannels);
apiRouter.get('/playlist', centralChannelController.playlist);
apiRouter.get('/:channelId', channelController.getChannel);
apiRouter.delete('/:channelId', channelController.deleteChannel);
apiRouter.put('/:channelId', channelController.updateChannel);
apiRouter.post('/', channelController.addChannel);
app.use('/api/channels', apiRouter);

const proxyRouter = express.Router();
proxyRouter.get('/channel', proxyController.channel);
proxyRouter.get('/segment', proxyController.segment);
proxyRouter.get('/key', proxyController.key);
proxyRouter.get('/current', centralChannelController.currentChannel);
app.use('/proxy', proxyRouter);


const PORT = 5000;
const server = app.listen(PORT, async () => {
  console.log(`Server listening on Port ${PORT}`);
  if (ChannelService.getCurrentChannel().restream()) {
    await streamController.start(ChannelService.getCurrentChannel());
  }
  PlaylistUpdater.startScheduler();
  PlaylistUpdater.registerChannelsPlaylist(ChannelService.getChannels());
});


// Web Sockets
const io = new Server(server);

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
