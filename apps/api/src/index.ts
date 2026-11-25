import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { config } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'

const app = express()

// Railway (and most PaaS hosts) terminate TLS at a proxy and forward the
// client IP via X-Forwarded-For. Trust exactly one proxy hop so rate limiting
// and logging see the real client instead of throwing.
app.set('trust proxy', 1)

// Security middleware
app.use(helmet())
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, error: 'Too many requests' },
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Static files for uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// API routes
app.use('/api', routes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const PORT = config.port

app.listen(PORT, () => {
  console.log(`VetPulse API running on port ${PORT}`)
  console.log(`Environment: ${config.nodeEnv}`)
})

export default app
