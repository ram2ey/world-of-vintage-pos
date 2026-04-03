import { Router } from 'express'
import { listStaff, login, refresh, me } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.get('/staff', listStaff)          // Public — login page picker
router.post('/login', login)             // Public — returns tokens
router.post('/refresh', refresh)         // Public — returns new access token
router.get('/me', authenticate, me)      // Protected — current staff

export default router
