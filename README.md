# FieldOps System Backend

Field service booking API where customers schedule technicians, pay via Stripe, and leave reviews.

Express 5 + TypeScript, Prisma 7 on PostgreSQL, Redis for OTP codes, Cloudinary for uploads, Stripe for payments.

## How it works

**Auth.** Register with email and password, then verify the 6-digit OTP sent to your inbox (stored in Redis, expires in 5 minutes). Verification returns an access token and a refresh token. Every request carries `Authorization: Bearer <accessToken>`; the middleware verifies the JWT and looks the user up in the database on `id` + `email` + `name` + `role`, so a banned or edited account loses access immediately. Refresh rotates the token pair.

**Roles.** Three: `CUSTOMER`, `TECHNICIAN`, `ADMIN`. The guard on each route decides what is public, what needs a technician, and what only an admin can do. Browsing services, technicians, and free slots is open; anything that writes to a profile is role-locked.

**Booking flow.** A technician publishes availability slots. A customer browses them, picks a slot, and creates a booking — this freezes the slot in the same transaction. The technician accepts or rejects, then works the job through `IN_PROGRESS` to `COMPLETED`. Transitions are enforced server-side, and the terminal states are final. Accepting a booking makes it payable; the customer completes payment through a Stripe Checkout session, and Stripe's webhook flips the payment to `PAID`. Once a completed booking is paid, the customer can review it, which recalculates the technician's aggregate rating.

**Images.** Service and technician images upload to Cloudinary via multipart form-data. Replacing an image deletes the old asset.

**Responses.** Every endpoint returns `{ success, statusCode, message, data }`, with `meta` added for pagination.

See `FieldOps.postman_collection.json` for all 42 routes.

## Known issues

- `src/middleware/globalErrorHandler.ts` computes a `statusCode` but always responds with HTTP 500, so 404s, 409s, and validation failures all arrive as 500 with the real code only in the body.
- Refresh tokens are read from a cookie that no controller sets; the request body field is what actually carries it.