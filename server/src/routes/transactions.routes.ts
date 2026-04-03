import { Router } from 'express'
import {
  createTransaction,
  voidTransaction,
  getSummary,
  listTransactions,
} from '../controllers/transactions.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/roleGuard'

const router = Router()

router.use(authenticate)

router.get('/summary',   requireRole('manager'), getSummary)
router.get('/',          requireRole('manager'), listTransactions)
router.post('/',         createTransaction)
router.put('/:id/void',  requireRole('manager'), voidTransaction)

export default router
