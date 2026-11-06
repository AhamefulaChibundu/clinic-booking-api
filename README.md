# Clinic Booking API

A RESTful clinic appointment booking system that allows patients to view available appointment slots, book appointments, retrieve their bookings, and cancel appointments.

## Live Demo

- **Frontend:** https://medcare-clinic.vercel.app
- **API Base URL:** https://clinic-booking-api-974d.onrender.com
- **API Health Check:** https://clinic-booking-api-974d.onrender.com/health

## Features

- View available appointment slots.
- Filter appointment slots by healthcare provider.
- Book appointments with input validation.
- Prevent double bookings, including concurrent booking attempts.
- Retrieve bookings using a booking ID or email address.
- Cancel existing bookings.
- Idempotent booking requests to prevent duplicate bookings on retries.
- Cursor-based pagination for booking history.
- API key authentication.
- Rate limiting to prevent excessive booking attempts.
- Persistent data storage.

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis
- Joi
- HTML, CSS and JavaScript
- Render and Vercel

## Project Structure

```text
clinic-booking-api/
├── backend/
│   ├── server.js
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── validators/
│
├── frontend/
│   ├── api/
│   │   └── proxy.js
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── vercel.json
│
└── README.md
```

## Installation

```bash
git clone https://github.com/AhamefulaChibundu/clinic-booking-api.git
cd clinic-booking-api/backend
npm install
```

Create a `.env` file in the `backend` directory using the provided `.env.example` file.

Configure the required environment variables:

- `PORT`
- `MONGO_URI`
- `REDIS_URL`
- `API_KEY`

Start the application:

```bash
npm run dev
```

## Authentication

All protected API endpoints require an API key supplied through the `X-API-Key` request header.

```http
X-API-Key: YOUR_API_KEY
```

The health check endpoint is public.

The frontend communicates with the backend through a server-side Vercel proxy, keeping the API key out of the browser.

## API Endpoints

Base URL:

```text
https://clinic-booking-api-974d.onrender.com
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/reset` | Reset booking data (maintenance endpoint) |
| GET | `/slots` | Retrieve available appointment slots |
| POST | `/bookings` | Create an appointment booking |
| GET | `/bookings/:id` | Retrieve a booking by ID |
| GET | `/bookings` | Retrieve bookings by email |
| DELETE | `/bookings/:id` | Cancel a booking |

## Query Parameters

**GET `/slots`**

| Parameter | Description |
|---|---|
| `provider` | Filter slots by healthcare provider |

**GET `/bookings`**

| Parameter | Description |
|---|---|
| `email` | Patient email address (required) |
| `limit` | Number of bookings per page (default: 10, maximum: 50) |
| `cursor` | Pagination cursor returned by the previous request |

## Example Booking Request

**POST `/bookings`**

Headers:

```http
X-API-Key: YOUR_API_KEY
Content-Type: application/json
Idempotency-Key: unique-request-key
```

Request body:

```json
{
  "slot_id": "slot_001",
  "name": "Grace Eze",
  "email": "grace.eze@example.com"
}
```

## HTTP Status Codes

| Status | Description |
|---|---|
| 200 | Request successful |
| 201 | Booking created successfully |
| 400 | Invalid request data |
| 401 | Missing or invalid API key |
| 404 | Resource not found |
| 409 | Booking conflict |
| 422 | Idempotency key conflict |
| 429 | Too many requests |
| 500 | Internal server error |
| 502 | Backend communication error |
| 503 | Rate-limiting service unavailable |

## Author

**Ahamefula Chibundu Uchechi**

- GitHub: [AhamefulaChibundu](https://github.com/AhamefulaChibundu)