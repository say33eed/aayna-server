# AAYNA API

Backend for **AAYNA — Looking good, simplified.**, a salon discovery, appointment booking, and self-care platform. The API manages authentication, services, bookings, journal content, administration, and Stripe test-mode payment processing.


| Resource | Link |
| --- | --- |
| Live website | `https://aayna-client.vercel.app/` |
| Client repository | `https://github.com/say33eed/aayna-client` |
| Server repository | `https://github.com/say33eed/aayna-server` |

## Important features

- Better Auth authentication, including Google OAuth integration.
- MongoDB-backed service, category, appointment, transaction, and journal workflows.
- Protected APIs with server-side authorization for role-restricted operations.
- Admin management endpoints for services, categories, users, transactions, and journal content.
- Stripe test-mode checkout integration and webhook-based payment confirmation.
- ImgBB integration for hosted service/category/journal imagery.
- Health endpoint for operational checks, input validation, CORS, and HTTP security headers.

## Technology stack

Node.js 22, Express 4, TypeScript, MongoDB native driver, Better Auth, Stripe SDK, Zod, Helmet, and CORS.

## Prerequisites

- Node.js 22 and npm
- MongoDB database/cluster and connection URI
- Google OAuth application credentials (for Google sign-in)
- Stripe test-mode keys and configured webhook endpoint
- ImgBB API key for image uploads

## Installation and local development

```powershell
git clone https://github.com/say33eed/aayna-client
cd aayna-server
npm ci
```

Create `.env` in the server root and provide the variables below. **Never commit this file.**

```powershell
npm run dev
```

The local API normally runs at `http://localhost:5000`; check `http://localhost:5000/health`. Run the frontend separately on port 3000.

## Required environment variable names

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | HTTP port (hosting platforms may supply this) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_ORIGIN` | Allowed frontend origin(s) for CORS |
| `BETTER_AUTH_SECRET` | Authentication signing secret |
| `BETTER_AUTH_URL` | Public base URL for auth/API server |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key (test mode for assignment) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `IMGBB_API_KEY` | ImgBB image hosting API key |

Use the exact URLs, redirect URIs, and webhook endpoint configured in your deployed services. The README intentionally contains variable **names only**, not secret values.

## Validation and production

```powershell
npm run typecheck
npm run build
npm start
```

Deploy to a Node.js-compatible host such as Render with `npm ci --include=dev && npm run build` as the build command and `npm start` as the start command. Set all required environment variables in the host dashboard, configure MongoDB network access, and register the deployed client URL in CORS and Google OAuth settings. Configure Stripe's webhook to reach the deployed API and verify webhook signature processing.

Before submission, confirm `/health`, authentication, protected routes, service listings, booking, checkout, and webhook-driven payment updates work on the deployed URLs. Check that route refreshes work and that the client can reach the API without CORS errors.

## Security

Keep `.env` and credentials out of Git. Protect administrative endpoints with server-side role verification; never trust client-only authorization. Payment status must be updated only after verified Stripe webhook events.
