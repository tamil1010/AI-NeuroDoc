import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';
import { createRequire } from 'module';

dotenv.config();

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Multer config for PDF uploads
const UPLOADS_DIR = path.join(__dirname, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

async function startServer() {
  console.log('Starting server initialization...');

  // Ensure uploads directory exists
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    console.log('Uploads directory ensured at:', UPLOADS_DIR);
  } catch (err) {
    console.warn('Error creating uploads directory:', err.message);
  }

  // Request logger middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // MongoDB Schemas
  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    createdAt: { type: Date, default: Date.now },
    preferences: {
      theme: { type: String, default: 'VOID_BLACK' },
      fontSize: { type: String, default: 'medium' },
      chatBubbleStyle: { type: String, default: 'futuristic' },
      responseStyle: { type: String, default: 'detailed' },
      notifications: { type: Boolean, default: true },
      voiceInput: { type: Boolean, default: true }
    }
  });

  const DocumentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    name: String,
    pageCount: Number,
    content: String,
    chunks: [String],
    uploadDate: { type: Date, default: Date.now }
  });

  const MessageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant', 'system'] },
    content: String,
    confidence: Number,
    timestamp: { type: Date, default: Date.now }
  });

  const PinnedMessageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    messageId: String,
    role: String,
    content: String,
    category: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now }
  });

  const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, default: 'New Session' },
    messages: [MessageSchema],
    documents: [DocumentSchema],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
  const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
  const PinnedMessage = mongoose.models.PinnedMessage || mongoose.model('PinnedMessage', PinnedMessageSchema);

  // In-memory fallback
  let inMemoryChats = [];
  let inMemoryDocs = [];
  let inMemoryPins = [];

  // In-memory share storage (ChatGPT-style - no DB)
  const sharedSessions = new Map();

  // Authenticate middleware
  const authenticate = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Auth required' });

      const jwt = (await import('jsonwebtoken')).default;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'neurodoc_secret');
      req.userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // ─── Auth Endpoints ────────────────────────────────────────────────────────

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const bcrypt = (await import('bcryptjs')).default;
      const jwt = (await import('jsonwebtoken')).default;

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Identity already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        email,
        password: hashedPassword,
        name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`
      });
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'neurodoc_secret', { expiresIn: '7d' });
      res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, preferences: user.preferences } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const bcrypt = (await import('bcryptjs')).default;
      const jwt = (await import('jsonwebtoken')).default;

      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: 'Identity not found' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: 'Access denied' });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'neurodoc_secret', { expiresIn: '7d' });
      res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, preferences: user.preferences } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      res.json({ registered: !!user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── User Endpoints ────────────────────────────────────────────────────────

  app.get('/api/user/me', authenticate, async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const docsCount = await Document.countDocuments({ userId: req.userId });
      const chatsCount = await Chat.countDocuments({ userId: req.userId });

      res.json({
        user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar, preferences: user.preferences, createdAt: user.createdAt },
        stats: { docsCount, chatsCount }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/user/preferences', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn('Database offline during preference update');
        return res.status(503).json({ error: 'Neuromapping core is temporarily offline (DB_DISCONNECTED)' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        console.warn(`User ${req.userId} not found for preference update`);
        return res.status(404).json({ error: 'Neural identity not found' });
      }

      console.log(`Updating preferences for user ${user.email}:`, req.body);
      user.preferences = { ...user.preferences.toObject(), ...req.body };
      await user.save();
      res.json(user.preferences);
    } catch (err) {
      console.error('Preference update system error:', err);
      res.status(500).json({ error: `SYSTEM_MALFUNCTION: ${err.message}` });
    }
  });

  app.patch('/api/user/profile', authenticate, async (req, res) => {
    try {
      const { name, avatar } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      await user.save();
      res.json({ id: user._id, email: user.email, name: user.name, avatar: user.avatar });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/user/data', authenticate, async (req, res) => {
    try {
      const { type } = req.query;
      if (!['chats', 'docs', 'all'].includes(type)) {
        return res.status(400).json({ error: 'Invalid data type' });
      }

      if (mongoose.connection.readyState !== 1) {
        if (type === 'chats' || type === 'all') {
          inMemoryChats = inMemoryChats.filter(c => c.userId !== req.userId);
        }
        if (type === 'docs' || type === 'all') {
          inMemoryDocs = inMemoryDocs.filter(d => d.userId !== req.userId);
          inMemoryChats = inMemoryChats.map(chat => (
            chat.userId === req.userId ? { ...chat, documents: [] } : chat
          ));
        }
        if (type === 'chats' || type === 'docs' || type === 'all') {
          inMemoryPins = inMemoryPins.filter(p => p.userId !== req.userId);
        }
        return res.json({ message: `Successfully cleared ${type} data` });
      }

      if (type === 'chats' || type === 'all') {
        await Chat.deleteMany({ userId: req.userId });
        await PinnedMessage.deleteMany({ userId: req.userId });
      }
      if (type === 'docs' || type === 'all') {
        await Document.deleteMany({ userId: req.userId });
        await Chat.updateMany({ userId: req.userId }, { $set: { documents: [] } });
        await PinnedMessage.deleteMany({ userId: req.userId });
      }
      res.json({ message: `Successfully cleared ${type} data` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Health Check (uses isReady via closure) ───────────────────────────────

  app.get('/api/health', (req, res) => {
    if (!isReady) return res.status(503).json({ status: 'starting' });
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  });

  // ─── Pin Endpoints ─────────────────────────────────────────────────────────

  app.get('/api/pins', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const pins = await PinnedMessage.find({ userId: req.userId }).sort({ createdAt: -1 });
        return res.json(pins);
      }
      res.json(inMemoryPins.filter(p => p.userId === req.userId));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pins', authenticate, async (req, res) => {
    try {
      const { chatId, messageId, content, role, category } = req.body;
      if (mongoose.connection.readyState === 1) {
        const pin = new PinnedMessage({ userId: req.userId, chatId, messageId, content, role, category });
        await pin.save();
        return res.status(201).json(pin);
      }
      const newPin = { _id: Date.now().toString(), userId: req.userId, chatId, messageId, content, role, category, createdAt: new Date() };
      inMemoryPins.push(newPin);
      res.status(201).json(newPin);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/pins/:id', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        await PinnedMessage.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        return res.json({ message: 'Pin removed' });
      }
      inMemoryPins = inMemoryPins.filter(p => p._id !== req.params.id);
      res.json({ message: 'Pin removed' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Export Endpoint ───────────────────────────────────────────────────────

  app.post('/api/export', async (req, res) => {
    try {
      const { format, messages, title } = req.body;

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'chat'}.json"`);
        return res.send(JSON.stringify(messages, null, 2));
      }

      if (format === 'txt') {
        const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'chat'}.txt"`);
        return res.send(text);
      }

      if (format === 'pdf') {
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'chat'}.pdf"`);

        doc.pipe(res);
        doc.fontSize(20).text(title || 'NEURODOC Session Export', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Exported on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        messages.forEach(m => {
          doc.fontSize(12).fillColor(m.role === 'user' ? 'blue' : 'black').text(m.role.toUpperCase(), { underline: true });
          doc.fontSize(10).fillColor('black').text(m.content);
          doc.moveDown();
        });

        doc.end();
        return;
      }

      res.status(400).json({ error: 'Invalid format' });
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Chat Endpoints ────────────────────────────────────────────────────────

  app.get('/api/chats', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const chats = await Chat.find({ userId: req.userId }).sort({ updatedAt: -1 }).select('title updatedAt createdAt');
        return res.json(chats);
      }
      res.json(inMemoryChats.filter(c => c.userId === req.userId).map(c => ({ _id: c._id, title: c.title, updatedAt: c.updatedAt })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chats', authenticate, async (req, res) => {
    try {
      const { title, messages, documents } = req.body;
      if (mongoose.connection.readyState === 1) {
        const chat = new Chat({
          userId: req.userId,
          title: title || 'INITIATED_LOG',
          messages: messages || [],
          documents: documents || []
        });
        await chat.save();
        if (Array.isArray(documents) && documents.length > 0) {
          await Document.insertMany(documents.map(doc => ({
            userId: req.userId,
            chatId: chat._id,
            name: doc.name,
            pageCount: doc.pageCount,
            content: doc.content,
            chunks: doc.chunks || []
          })));
        }
        return res.status(201).json(chat);
      }
      const newChat = {
        _id: Date.now().toString(),
        userId: req.userId,
        title: title || 'INITIATED_LOG',
        messages: messages || [],
        documents: documents || [],
        updatedAt: new Date()
      };
      inMemoryChats.push(newChat);
      res.status(201).json(newChat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/chats/:id', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
        if (!chat) return res.status(404).json({ error: 'Log not found' });
        const savedDocuments = await Document.find({ chatId: req.params.id, userId: req.userId });
        const chatData = chat.toObject();
        if (savedDocuments.length > 0) chatData.documents = savedDocuments;
        return res.json(chatData);
      }
      const chat = inMemoryChats.find(c => c._id === req.params.id && c.userId === req.userId);
      if (!chat) return res.status(404).json({ error: 'Log not found' });
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public-chats/:id', async (req, res) => {
    try {
      const chat = await Chat.findOne({ _id: req.params.id, isPublic: true });
      if (!chat) return res.status(404).json({ error: 'Shared log not found or access restricted' });
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/chats/:id/share', authenticate, async (req, res) => {
    try {
      const { isPublic } = req.body;
      const chat = await Chat.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { isPublic },
        { new: true }
      );
      if (!chat) return res.status(404).json({ error: 'Log not found' });
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chats/:id/share-token', authenticate, async (req, res) => {
    try {
      const chatId = req.params.id;

      let chat = null;
      if (mongoose.connection.readyState === 1) {
        chat = await Chat.findOne({ _id: chatId, userId: req.userId });
      }
      if (!chat) {
        chat = inMemoryChats.find(c => c._id === chatId && c.userId === req.userId);
      }
      if (!chat) return res.status(404).json({ error: 'Log not found' });

      const token = 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      sharedSessions.set(token, {
        messages: chat.messages,
        documents: chat.documents || [],
        createdAt: new Date().toISOString()
      });

      setTimeout(() => sharedSessions.delete(token), 24 * 60 * 60 * 1000);

      res.json({
        shareToken: token,
        shareUrl: `${process.env.FRONTEND_URL || req.headers.origin || ''}?share=${token}`
      });
    } catch (err) {
      console.error('Share token error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/shared/:token', async (req, res) => {
    try {
      const session = sharedSessions.get(req.params.token);
      if (!session) return res.status(404).json({ error: 'Shared session not found or expired' });
      res.json({ messages: session.messages, documents: session.documents, isShared: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chats/:id/messages', authenticate, async (req, res) => {
    try {
      const { role, content, confidence } = req.body;
      if (mongoose.connection.readyState === 1) {
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
        if (!chat) return res.status(404).json({ error: 'Log not found' });

        chat.messages.push({ role, content, confidence });
        chat.updatedAt = new Date();

        if (chat.title === 'INITIATED_LOG' && role === 'user') {
          chat.title = content.substring(0, 30).toUpperCase();
        }

        await chat.save();
        return res.json(chat);
      }
      const chat = inMemoryChats.find(c => c._id === req.params.id && c.userId === req.userId);
      if (!chat) return res.status(404).json({ error: 'Log not found' });
      chat.messages.push({ role, content, confidence, timestamp: new Date() });
      chat.updatedAt = new Date();
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chats/:id/documents', authenticate, async (req, res) => {
    try {
      const { name, pageCount, content, chunks } = req.body;
      if (!name) return res.status(400).json({ error: 'Document name is required' });

      const contentText = typeof content === 'string' ? content : '';
      const chunkList = Array.isArray(chunks) ? chunks : [];
      const maxContentLength = 10 * 1024 * 1024;
      const savedContent = contentText.length > maxContentLength ? contentText.slice(0, maxContentLength) : contentText;

      const documentPayload = { userId: req.userId, chatId: req.params.id, name, pageCount, content: savedContent, chunks: chunkList };
      const chatDocumentMetadata = { userId: req.userId, chatId: req.params.id, name, pageCount };

      if (mongoose.connection.readyState === 1) {
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
        if (!chat) return res.status(404).json({ error: 'Log not found' });

        const document = new Document(documentPayload);
        await document.save();

        chat.documents.push(chatDocumentMetadata);
        chat.updatedAt = new Date();
        await chat.save();

        return res.status(201).json(document);
      }

      const chat = inMemoryChats.find(c => c._id === req.params.id && c.userId === req.userId);
      if (!chat) return res.status(404).json({ error: 'Log not found' });
      const document = { _id: Date.now().toString(), ...documentPayload, uploadDate: new Date() };
      inMemoryDocs.push(document);
      chat.documents.push(chatDocumentMetadata);
      chat.updatedAt = new Date();
      res.status(201).json(document);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/chats/:id', authenticate, async (req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        await Chat.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        await Document.deleteMany({ chatId: req.params.id, userId: req.userId });
        await PinnedMessage.deleteMany({ chatId: req.params.id, userId: req.userId });
        return res.json({ message: 'Chat deleted' });
      }
      inMemoryChats = inMemoryChats.filter(c => c._id !== req.params.id);
      inMemoryDocs = inMemoryDocs.filter(d => d.chatId !== req.params.id);
      inMemoryPins = inMemoryPins.filter(p => p.chatId !== req.params.id);
      res.json({ message: 'Chat deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── PDF Extraction ────────────────────────────────────────────────────────

  app.post('/api/extract-text', upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      console.log('Processing file:', req.file.originalname, 'Size:', req.file.size);
      const dataBuffer = await fs.readFile(req.file.path);

      let text = '';
      let numpages = 0;
      let info = {};

      try {
        let pdfMod;
        try {
          pdfMod = await import('pdf-parse');
        } catch (e) {
          const localRequire = createRequire(import.meta.url);
          pdfMod = localRequire('pdf-parse');
        }

        if (pdfMod && pdfMod.PDFParse) {
          console.log('Using pdf-parse v2+ API');
          const parser = new pdfMod.PDFParse({ data: dataBuffer });
          try {
            const textResult = await parser.getText();
            const infoResult = await parser.getInfo();
            text = textResult.text || '';
            numpages = infoResult.total || 0;
            info = infoResult.info || {};
          } finally {
            if (parser.destroy) await parser.destroy().catch(() => {});
          }
        } else {
          console.log('Using pdf-parse functional API');
          const pdfExtract = pdfMod.default || pdfMod;
          const data = await (typeof pdfExtract === 'function' ? pdfExtract(dataBuffer) : pdfExtract.pdf(dataBuffer));
          text = data.text || '';
          numpages = data.numpages || 0;
          info = data.info || {};
        }
      } catch (e) {
        console.warn('Primary parser failed, trying pdf-extraction:', e.message);
        try {
          const pdfExtractMod = await import('pdf-extraction');
          const pdfExtract = pdfExtractMod.default || pdfExtractMod;
          const data = await pdfExtract(dataBuffer);
          text = data.text;
          numpages = data.numpages;
          info = data.info;
        } catch (e2) {
          console.error('All PDF extraction attempts failed:', e2);
          throw new Error('Failed to parse PDF document with available libraries.');
        }
      }

      console.log('Extraction complete. Pages:', numpages);
      await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

      res.json({ text, info, numpages, filename: req.file.originalname });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // ─── Root Route ────────────────────────────────────────────────────────────

  app.get('/', (req, res) => {
    res.send('NeuroDoc Backend Running...');
  });

  // ─── Global Error Handler ──────────────────────────────────────────────────

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // ─── MongoDB Connection ────────────────────────────────────────────────────
  // IMPORTANT: isReady declared here; /api/health above uses it via JS closure

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  let isReady = false;

  mongoose.connect(MONGODB_URI)
    .then(() => {
      isReady = true;
      console.log('MongoDB Connected');
    })
    .catch(err => {
      isReady = true; // mark ready so in-memory fallback is usable
      console.error('MongoDB connection error:', err.message);
      console.warn('⚠️  Running in in-memory fallback mode');
    });

  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Server environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  // ─── Start Listening ───────────────────────────────────────────────────────

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`READY: Server is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
});
