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


const app: Application = express()

app.use(
    cors({
        origin: config.frontend_url,
        credentials: true,
    }),
)

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }))

// Middleware to parse JSON bodies
app.use(express.json())
app.use(cookieParser())

app.use('/api/v1/auth', AuthRoutes)
app.use("/api/v1/services", ServiceRoutes)
app.use("/api/v1/technicians", TechnicianRoutes)

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
