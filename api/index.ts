// Vercel serverless entry point. Unlike server.ts (used for local dev and
// self-hosting via `npm start`), this must NOT call app.listen() — Vercel
// invokes the exported Express app per-request instead of running a
// persistent server. See vercel.json for the rewrite that routes /api/*
// requests here.
import { app } from "../apiApp";

export default app;
