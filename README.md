# 🧠 NeuroDoc

NeuroDoc is a full-stack AI-powered document intelligence platform built using the MERN stack. The application allows users to upload PDF documents, interact with them through AI-powered conversations, generate summaries, extract important insights, and manage document chat history securely. The project focuses on modern UI/UX, AI-driven document analysis, structured backend APIs, and seamless frontend-backend integration.

---

# 🚀 Key Features

* 📄 PDF Upload & Parsing – Upload and process PDF documents
* 🤖 AI-Powered Document Chat – Ask questions directly from uploaded PDFs
* 🧠 Gemini AI Integration – Context-aware intelligent responses
* 🔍 Semantic Search – Retrieve relevant document chunks using embeddings
* 📌 Pinned Messages – Save important AI responses
* 🗂 Chat History – Persistent conversation sessions
* 🔐 Authentication System – Secure login and signup functionality
* 🌐 Shareable Sessions – Generate public shareable chat links
* 📊 AI Summarization – Generate summaries from uploaded documents
* 🧬 Entity Extraction – Extract names, emails, and important information
* 🌙 Modern UI – Futuristic dark-themed responsive design
* 🔗 REST API Integration – Complete frontend-backend communication

---

# 🛠 Tech Stack

- Frontend : React (Vite), Tailwind CSS / Custom CSS, Framer Motion, Lucide React, D3.js, React Markdown
- Backend : Node.js, Express.js, Multer, PDF Parsing Libraries
- AI Integration : Google Gemini AI, Gemini Embedding API
- Database : MongoDB Atlas
- Architecture : REST API (No WebSockets), Client–Server Model

---

# 📁 Project Structure

```
NEURODOC/
│
├── backend/                    # Backend (Node.js + Express)
│   ├── uploads/                # Uploaded PDF files
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/                   # Frontend (React + Vite)
│   ├── dist/
│   ├── assets/
│   ├── node_modules/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── .env
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── README.md
│
└── .gitignore
```

---

# 🔗 Core Functional Flow

* User registers / logs in
* PDF documents uploaded to backend
* Backend extracts document text
* Gemini embeddings generated for semantic retrieval
* User asks questions about uploaded document
* AI generates contextual responses from document data
* Chat history and pinned messages stored in MongoDB
* Shareable public session links generated

---

# ⚙️ Setup Instructions

## Clone Repository

```
git clone https://github.com/your-username/neurodoc.git
```

---

## Install Dependencies

### Frontend

```
cd frontend
npm install
npm run dev
```

---

### Backend

```
cd backend
npm install
node server.js
```

---

# 🔐 Environment Variables

## Backend

Create `.env` inside `backend/`

```
MONGODB_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

GEMINI_API_KEY=your_gemini_api_key

PORT=5000
```

---

## Frontend

Create `.env` inside `frontend/`

```
VITE_API_URL=https://your-render-backend.onrender.com

VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

# 🌐 Deployment

Frontend → Vercel

Backend → Render

Database → MongoDB Atlas
