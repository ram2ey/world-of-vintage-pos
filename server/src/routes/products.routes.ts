import { Router } from 'express'
import {
  listProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateVariant,
  listCategories,
} from '../controllers/products.controller'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/roleGuard'

const router = Router()

// All product routes require authentication
router.use(authenticate)

router.get('/',                              listProducts)
router.get('/categories',                    listCategories)
router.get('/barcode/:barcode',              getProductByBarcode)
router.get('/:id',                           getProduct)
router.post('/',           requireRole('manager'), createProduct)
router.put('/:id',         requireRole('manager'), updateProduct)
router.put('/:id/variants/:variantId', requireRole('manager'), updateVariant)

export default router
