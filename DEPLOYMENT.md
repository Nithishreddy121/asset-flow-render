# Render Deployment Guide

## Current project architecture

This repository is a Next.js 16 application. It can be deployed as a Render Node.js Web Service.

Important: the current application uses client-side mock authentication and mock data. The PostgreSQL SQL files under `scripts/` are a database schema/seed reference, but the current UI does not establish a PostgreSQL connection.

## Render Web Service

Create a **Web Service** from the repository and use:

- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Plan: Free (or another plan as required)

Render's Next.js deployment documentation supports deploying a full Next.js app as a Node.js web service.

## Environment variables

The existing project defines `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in its deployment configuration, but the current authentication implementation is custom client-side authentication and does not use NextAuth.

You may leave them unset unless you later migrate authentication to NextAuth.

## Demo accounts in the current UI

- Admin: `admin` / `admin123`
- Base Commander: `cmd_liberty` / `admin123`
- Logistics Officer: `log_liberty` / `admin123`

## Database

The project contains:

- `scripts/01-create-tables.sql`
- `scripts/02-seed-data.sql`

These create and seed PostgreSQL tables, but they are not currently wired into the Next.js application.

If a real PostgreSQL-backed version is required, the next step is to add a server-side database layer/API and move authentication and authorization off the client.

## Docker

The repository contains a Dockerfile, but the normal Render Node.js Web Service configuration above is simpler for this project. The Dockerfile expects Next.js standalone output, while `next.config.mjs` currently does not enable `output: "standalone"`.

## Local verification

```bash
npm install
npm run build
npm start
```
