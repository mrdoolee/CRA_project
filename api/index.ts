// Vercel serverless entry point. Unlike server.ts (used for local dev and
// self-hosting via `npm start`), this must NOT call app.listen() — Vercel
// invokes the exported Express app per-request instead of running a
// persistent server. See vercel.json for the rewrite that routes /api/*
// requests here.
//
// Vercel doesn't bundle this into a single file — it transpiles this file
// and apiApp.ts separately and links them via Node's native ESM loader at
// runtime, which (unlike TS's "bundler" resolution used for local
// typechecking/Vite) requires an explicit extension on relative specifiers.
// Without it: "ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/apiApp'".
import { app } from "../apiApp.js";

export default app;
