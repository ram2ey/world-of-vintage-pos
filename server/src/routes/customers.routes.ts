import { Router } from 'express'
import {
  listCustomers,
  getCustomer,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
} from '../controllers/customers.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/',              listCustomers)
router.get('/:id',           getCustomer)
router.get('/:id/history',   getCustomerHistory)
router.post('/',             createCustomer)
router.put('/:id',           updateCustomer)

export default router
