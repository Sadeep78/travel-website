<img width="1882" height="851" alt="Screenshot 2026-05-29 211058" src="https://github.com/user-attachments/assets/f53500a6-3f24-4f0c-af46-dfba54eba8f1" />
<img width="1888" height="845" alt="Screenshot 2026-05-29 210933" src="https://github.com/user-attachments/assets/24b9d88f-e5f2-4bb7-8e4e-c048536913d8" />
<img width="1881" height="853" alt="Screenshot 2026-05-29 210850" src="https://github.com/user-attachments/assets/cc5fece6-0e74-488b-97f8-0cdf2b20521c" />
<img width="1894" height="848" alt="Screenshot 2026-05-29 210707" src="https://github.com/user-attachments/assets/095274b0-7284-443b-9879-f4679c10da07" />
# Travel Partner

A full-stack Sri Lanka travel site built with **Node.js**, **Express**, **MySQL**, and a vanilla HTML/CSS/JS frontend. Browse destinations, book tours, send inquiries, and manage bookings from an admin portal.

## Features

- Destination catalog with search, category, budget, and featured filters
- API-driven homepage sections (featured tours, map grid, popular list)
- Multi-step checkout with traveler quantity
- User registration and session-based login
- Admin dashboard for bookings and contact inquiries
- Automatic database creation, migrations, and seed data on startup

## Requirements

- Node.js 18+
- MySQL 8+ (optional but recommended; without MySQL only read-only destination browsing works)

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your MySQL credentials and a strong `SESSION_SECRET`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. (Optional) Import SQL manually in MySQL Workbench:
   - `backend/db/schema.sql`
   - `backend/db/seed.sql`
5. Start the server:
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

Default admin (first run): `admin@travel.com` / `Admin@123` — change via `.env` before production.

## Project structure

| Path | Purpose |
|------|---------|
| `backend/server.js` | Express app, API routes, DB bootstrap |
| `backend/data/destinations.js` | Canonical destination catalog |
| `backend/db/schema.sql` | Full MySQL schema |
| `backend/db/seed.sql` | Destination seed data |
| `frontend/` | Static HTML, CSS, JS, images |
| `scripts/setup_db.js` | Optional MySQL user/database helper |

## API overview

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/destinations` | List/filter destinations (`q`, `category`, `maxPrice`, `slug`, `featured`) |
| GET | `/api/destinations/meta` | Filter metadata (categories, regions, budgets) |
| POST | `/api/contact` | Submit itinerary inquiry |
| POST | `/api/booking` | Create booking |
| POST | `/api/register`, `/api/login`, `/api/logout` | Auth |
| GET | `/api/profile` | Current session |
| GET/PUT/DELETE | `/api/bookings` | Admin booking management |
| GET | `/api/requests` | Admin contact list |

## Production notes

- Set `NODE_ENV=production` and a strong `SESSION_SECRET`.
- Change default admin credentials.
- Use HTTPS so secure session cookies work.
- Card payments in checkout are simulated (only last 4 digits stored); integrate a real payment provider for live use.
