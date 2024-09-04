const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle CORS
app.use(cors());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hospital: { type: String, required: true },
  email: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Content Schema
const contentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  hospital: { type: String, required: true },
  manufacturingDate: { type: Date, required: true },
}, { collection: 'content' });

const Content = mongoose.model('Content', contentSchema);
const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  hospitalName: { type: String, required: true },
  query: { type: String, required: true },
}, { collection: 'messages' });

const Message = mongoose.model('Message', messageSchema);
// Sign up route
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, hospital, email } = req.body;

    if (!username || !password || !hospital || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, hospital, email });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', username });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password,  hospital } = req.body;

    if (!username || !password  || !hospital) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Logged in successfully', username });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public profile route
app.get('/api/profile', async (req, res) => {
  try {
    const { username } = req.query;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ username: user.username, hospital: user.hospital, email: user.email });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create content
app.post('/api/content', async (req, res) => {
    try {
      const { userId, name, quantity, expiryDate, manufacturingDate, hospital } = req.body;
  
      const newContent = new Content({
        userId,
        name,
        quantity,
        expiryDate,
        manufacturingDate,
        hospital
      });
  
      await newContent.save();
      res.status(201).json(newContent);
    } catch (error) {
      res.status(500).json({ error: 'Error creating content: ' + error.message });
    }
  });
  app.get('/api/content/full', async (req, res) => {
    try {
      const allContent = await Content.find();
      res.status(200).json(allContent);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching full content details: ' + error.message });
    }
  });
  // Get content for a specific user
  app.get('/api/content/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const userContent = await Content.find({ userId });
      res.status(200).json(userContent);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching content: ' + error.message });
    }
  });
  
  // Update content by ID
  app.put('/api/content/:id', async (req, res) => {
    const { id } = req.params;
    const { name, quantity, expiryDate, manufacturingDate } = req.body;
    try {
      const updatedContent = await Content.findByIdAndUpdate(
        id,
        { name, quantity, expiryDate, manufacturingDate },
        { new: true }
      );
      res.status(200).json(updatedContent);
    } catch (error) {
      res.status(500).json({ error: 'Error updating content: ' + error.message });
    }
  });
  
  // Delete content by ID
  app.delete('/api/content/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await Content.findByIdAndDelete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Error deleting content: ' + error.message });
    }
  });
// Define the path to the messages file
// Message Schema
// Endpoint to get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Endpoint to post a new message
app.post('/api/messages', async (req, res) => {
  try {
    const { userId, hospitalName, query } = req.body;

    if (!userId || !hospitalName || !query) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const newMessage = new Message({ userId, hospitalName, query });
    await newMessage.save();
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Error creating message' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
