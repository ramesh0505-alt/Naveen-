# Private 2-Person Encrypted Ephemeral Messenger

A private, zero-footprint 2-person communication suite with end-to-end PIN verification, real-time presence, WebSockets, WebRTC P2P voice calling, disappearing audio messages with interactive waveforms, and low-data mobile optimizations.

---

## 🚀 Deployment Guide

This app is a **Full-Stack Application** featuring:
- **Client (React 19 + Tailwind CSS + Vite)**
- **Backend (Node.js Express + WebSocket Server in `server.ts`)**

> ⚠️ **Important Hosting Note:**
> Platforms like **Netlify** or **GitHub Pages** only host static HTML/CSS/JS files and do **not** run Node.js WebSocket background processes. If deployed as a purely static site without a Node backend, API calls like `/api/rooms` will return Netlify's fallback `index.html` (causing `Unexpected token '<', "<!DOCTYPE "` errors).

To run this app properly, deploy it using any of the following platforms:

---

### Option 1: Deploy to Render (Recommended & Free)
1. Push this repository to **GitHub**.
2. Go to [Render.com](https://render.com) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Port**: `3000` (or leave default, bound to `0.0.0.0`)
5. Click **Create Web Service**. Your app is live with full WebSocket support!

---

### Option 2: Deploy to Railway (Zero Configuration)
1. Push this repository to **GitHub**.
2. Go to [Railway.app](https://railway.app) and click **New Project > Deploy from GitHub repo**.
3. Select your repository. Railway will automatically detect `package.json`, build the frontend, and start `node dist/server.cjs`.

---

### Option 3: Deploy with Docker / Cloud Run / VPS
A `Dockerfile` is included in the root directory:

```bash
# Build Docker image
docker build -t private-chat .

# Run container on port 3000
docker run -p 3000:3000 private-chat
```

---

### Option 4: Local Development & Production

#### Development Mode:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build & Run:
```bash
npm run build
npm run start
```

---

### Option 5: Split Architecture (Static Netlify Frontend + Render Backend)
If you want to host the frontend on Netlify while hosting the Node.js WebSocket backend on Render/Railway:
1. In Netlify Site Settings > **Environment variables**, set:
   - `VITE_API_URL` = `https://your-backend-service.onrender.com`
   - `VITE_WS_URL` = `wss://your-backend-service.onrender.com/ws`
2. Redeploy the Netlify site. The frontend will communicate with your live WebSocket backend.
