import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Application, Request, Response } from 'express'
import httpStatus from "http-status"
import config from './config'
import { AuthRoutes } from './module/auth/auth.route'
import { globalErrorHandler } from './middleware/globalErrorHandler'
import { notFound } from './middleware/notFound'
import { ServiceRoutes } from './module/service/service.route'
import { TechnicianRoutes } from './module/technician/technician.route'
import { AvailabilityRoutes } from './module/availability/availability.route'
import { BookingRoutes } from './module/booking/booking.route'
import { PaymentRoutes } from './module/payment/payment.route'
import { PaymentController } from './module/payment/payment.controller'
import { ReviewRoutes } from './module/review/review.route'
import { AnalyticsRoutes } from './module/analytics/analytics.route'


const app: Application = express()

app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "https://fieldpro-backend-iota.vercel.app",
    ],
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }))

app.post(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
    PaymentController.stripeWebhook,
)

// Middleware to parse JSON bodies
app.use(express.json())
app.use(cookieParser())

app.use('/api/v1/auth', AuthRoutes)
app.use("/api/v1/services", ServiceRoutes)
app.use("/api/v1/technicians", TechnicianRoutes)
app.use("/api/v1/availability", AvailabilityRoutes)
app.use("/api/v1/bookings", BookingRoutes)
app.use("/api/v1/payments", PaymentRoutes)
app.use("/api/v1/reviews", ReviewRoutes)
app.use("/api/v1/analytics", AnalyticsRoutes)

// Basic route
app.get('/', async (req: Request, res: Response) => {
    res.status(httpStatus.OK).json({
        success: true,
        message: 'Welcome to FieldOps System Backend',
    })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app
