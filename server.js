// --- Required Modules ---
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('./middleware/authMiddleware');
const Poll = require('./models/Poll');

// --- Initialize App and Server ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Connect to MongoDB ---
mongoose.connect("mongodb://127.0.0.1:27017/kyubane-auth", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', require('./routes/auth')); // login/signup routes

// --- Create Poll (Protected Route) ---
app.post('/create-poll', authMiddleware, async (req, res) => {
  try {
    const { question, options } = req.body;
    const optionsMap = new Map(options.map(option => [option, 0]));
    
    const poll = new Poll({
      question,
      options: optionsMap,
      createdBy: req.user.userId
    });

    await poll.save();
    res.json({ pollId: poll._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// --- Get Polls Created by Logged-in User (Protected Route) ---
app.get('/api/polls', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching polls for user:', req.user.userId);
    
    // Check if user ID is valid
    if (!req.user.userId) {
      console.error('Invalid user ID in token');
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Find all polls for this user
    const userPolls = await Poll.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${userPolls.length} polls for user ${req.user.userId}`);
    
    // Convert Map objects to plain objects for JSON serialization
    const serializedPolls = userPolls.map(poll => {
      const pollObj = poll.toObject();
      // Convert Map to plain object
      pollObj.options = Object.fromEntries(poll.options);
      return pollObj;
    });
    
    res.json(serializedPolls);
  } catch (err) {
    console.error('Error fetching polls:', err);
    res.status(500).json({ error: 'Failed to fetch polls', details: err.message });
  }
});

// --- Get Single Poll (Public Route) ---
app.get('/api/polls/:pollId', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// --- Delete Poll (Protected Route) ---
app.delete('/api/polls/:pollId', authMiddleware, async (req, res) => {
    try {
        const poll = await Poll.findOneAndDelete({ _id: req.params.pollId, createdBy: req.user.userId });
        if (!poll) {
            return res.status(404).json({ error: 'Poll not found or you are not authorized to delete it' });
        }
        res.json({ message: 'Poll deleted successfully' });
    } catch (err) {
        console.error('Error deleting poll:', err);
        res.status(500).json({ error: 'Failed to delete poll' });
    }
});

// --- Socket.IO Poll Voting System ---
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on('joinPoll', async (pollId) => {
    socket.join(pollId);
    try {
      const poll = await Poll.findById(pollId); // Fetch poll from MongoDB
      if (poll) {
        socket.emit('pollData', poll); // Send poll data to the client
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('castVote', async ({ pollId, option }) => {
    try {
      const poll = await Poll.findById(pollId);
      if (poll && poll.options.has(option)) {
        poll.options.set(option, poll.options.get(option) + 1); // Increment vote count
        await poll.save(); // Save updated poll to MongoDB
        io.to(pollId).emit('voteUpdate', Object.fromEntries(poll.options)); // Notify clients
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
