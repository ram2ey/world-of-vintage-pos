import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// ─── GET /products ─────────────────────────────────────────────────────────────
// Query params: search, category, page, limit

export async function listProducts(req: Request, res: Response): Promise<void> {
  const { search, category, page = '1', limit = '50' } = req.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = { isActive: true }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { barcode: { equals: search } },
    ]
  }

  if (category) {
    where.category = { name: { equals: category, mode: 'insensitive' } }
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          variants: { orderBy: { size: 'asc' } },
          markdowns: {
            where: {
              isActive: true,
              startsAt: { lte: new Date() },
              endsAt: { gte: new Date() },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    res.json({
      data: products.map(serializeProduct),
      total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[products] listProducts error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /products/:id ────────────────────────────────────────────────────────

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: { orderBy: { size: 'asc' } },
        markdowns: {
          where: {
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        },
      },
    })

    if (!product) {
      res.status(404).json({ message: 'Product not found' })
      return
    }

    res.json({ data: serializeProduct(product) })
  } catch (err) {
    console.error('[products] getProduct error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /products/barcode/:barcode ───────────────────────────────────────────

export async function getProductByBarcode(req: Request, res: Response): Promise<void> {
  const { barcode } = req.params

  try {
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        variants: { orderBy: { size: 'asc' } },
        markdowns: {
          where: {
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        },
      },
    })

    if (!product) {
      res.status(404).json({ message: 'Product not found' })
      return
    }

    res.json({ data: serializeProduct(product) })
  } catch (err) {
    console.error('[products] getProductByBarcode error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── POST /products (manager) ─────────────────────────────────────────────────

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, categoryId, description, imageUrl, basePrice, barcode, variants } = req.body

  if (!name || !categoryId || basePrice == null) {
    res.status(400).json({ message: 'name, categoryId, and basePrice are required' })
    return
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        description,
        imageUrl,
        basePrice,
        barcode,
        variants: variants
          ? {
              create: variants.map((v: { size: string; color: string; colorHex: string; quantity: number; sku: string; lowStockThreshold?: number }) => ({
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                quantity: v.quantity ?? 0,
                sku: v.sku,
                lowStockThreshold: v.lowStockThreshold ?? 3,
              })),
            }
          : undefined,
      },
      include: { category: true, variants: true },
    })

    res.status(201).json({ data: serializeProduct(product) })
  } catch (err) {
    console.error('[products] createProduct error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── PUT /products/:id (manager) ─────────────────────────────────────────────

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { name, description, imageUrl, basePrice, barcode, isActive } = req.body

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { name, description, imageUrl, basePrice, barcode, isActive },
      include: { category: true, variants: true, markdowns: true },
    })

    res.json({ data: serializeProduct(product) })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ message: 'Product not found' })
      return
    }
    console.error('[products] updateProduct error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── PUT /products/:id/variant/:variantId (manager) ──────────────────────────

export async function updateVariant(req: Request, res: Response): Promise<void> {
  const { variantId } = req.params
  const { quantity, lowStockThreshold, price } = req.body

  try {
    const variant = await prisma.variant.update({
      where: { id: variantId },
      data: {
        ...(quantity != null && { quantity }),
        ...(lowStockThreshold != null && { lowStockThreshold }),
      },
    })

    res.json({ data: variant })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ message: 'Variant not found' })
      return
    }
    console.error('[products] updateVariant error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /categories ──────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json({ data: categories })
  } catch (err) {
    console.error('[products] listCategories error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── Serializer ───────────────────────────────────────────────────────────────

function serializeProduct(p: Record<string, unknown>): unknown {
  return {
    ...p,
    basePrice: Number(p.basePrice),
    variants: Array.isArray(p.variants)
      ? (p.variants as Array<Record<string, unknown>>).map((v) => ({
          ...v,
        }))
      : undefined,
    markdowns: Array.isArray(p.markdowns)
      ? (p.markdowns as Array<Record<string, unknown>>).map((m) => ({
          ...m,
          discountPercentage: Number(m.discountPercentage),
        }))
      : undefined,
  }
}
