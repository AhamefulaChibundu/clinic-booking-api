# Clinic Booking API

A clinic appointment booking system built with Node.js and Express. It provides an API for retrieving available appointment slots, booking appointments, viewing bookings, and cancelling appointments.

## Features

- Retrieve available appointment slots.
- Book appointments with input validation.
- Prevent double-booking, including simultaneous booking attempts.
- Support idempotent booking requests to prevent duplicate bookings during retries.
- Retrieve bookings with pagination.
- Cancel existing bookings.
- API key authentication.
- Rate limiting on booking attempts.

## Technology Stack

- Node.js
- Express.js
- MongoDB and Mongoose
- Redis
- Joi

## Project Structure

- `backend/` — Express API, database models, middleware, and controllers.
- `frontend/` — Web interface for interacting with the booking API.

## Status

Under development.