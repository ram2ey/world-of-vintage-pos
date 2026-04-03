import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'

// ─── POST /transactions ───────────────────────────────────────────────────────

export async function createTransaction(req: Request, res: Response): Promise<void> {
  const {
    customerId,
    items,         // [{ variantId, quantity, unitPrice }]
    paymentMethod,
    paymentSplit,  // optional
    discountAmount = 0,
    discountCode,
    managerPin,    // required if discountAmount > 0
  } = req.body

  if (!items?.length || !paymentMethod) {
    res.status(400).json({ message: 'items and paymentMethod are required' })
    return
  }

  // If a discount is applied, verify manager PIN
  if (Number(discountAmount) > 0) {
    if (!managerPin) {
      res.status(400).json({ message: 'Manager PIN required for discounts' })
      return
    }
    const managers = await prisma.staff.findMany({ where: { role: 'manager', isActive: true } })
    let pinValid = false
    for (const mgr of managers) {
      if (await bcrypt.compare(String(managerPin), mgr.pin)) {
        pinValid = true
        break
      }
    }
    if (!pinValid) {
      res.status(403).json({ message: 'Invalid manager PIN' })
      return
    }
  }

  try {
    // Validate all variants and compute subtotal
    const variantIds: string[] = items.map((i: { variantId: string }) => i.variantId)
    const variants = await prisma.variant.findMany({ where: { id: { in: variantIds } } })
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    for (const item of items) {
      const v = variantMap.get(item.variantId)
      if (!v) {
        res.status(400).json({ message: `Variant ${item.variantId} not found` })
        return
      }
      if (v.quantity < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for variant ${item.variantId}` })
        return
      }
    }

    const subtotal = items.reduce(
      (sum: number, i: { unitPrice: number; quantity: number }) => sum + i.unitPrice * i.quantity,
      0
    )
    const total = Math.max(0, subtotal - Number(discountAmount))
    const receiptNumber = `WOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const transaction = await prisma.$transaction(async (tx) => {
      // Decrement stock
      for (const item of items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: item.quantity } },
        })
      }

      // Create transaction
      const created = await tx.transaction.create({
        data: {
          customerId: customerId || null,
          staffId: req.staff!.staffId,
          subtotal,
          discountAmount: Number(discountAmount),
          total,
          status: 'completed',
          paymentMethod,
          paymentSplit: paymentSplit ?? null,
          receiptNumber,
          items: {
            create: items.map((i: { variantId: string; quantity: number; unitPrice: number }) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.unitPrice * i.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              variant: { include: { product: { select: { name: true } } } },
            },
          },
          staff: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
      })

      // Record customer visit
      if (customerId) {
        await tx.customerVisit.create({
          data: { customerId, transactionId: created.id },
        })
      }

      return created
    })

    res.status(201).json({ data: serializeTransaction(transaction) })
  } catch (err) {
    console.error('[transactions] createTransaction error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── PUT /transactions/:id/void (manager) ────────────────────────────────────

export async function voidTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      res.status(404).json({ message: 'Transaction not found' })
      return
    }

    if (existing.status === 'voided') {
      res.status(400).json({ message: 'Transaction already voided' })
      return
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of existing.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { quantity: { increment: item.quantity } },
        })
      }

      return tx.transaction.update({
        where: { id },
        data: { status: 'voided' },
      })
    })

    res.json({ data: serializeTransaction(transaction) })
  } catch (err) {
    console.error('[transactions] voidTransaction error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /transactions/summary ────────────────────────────────────────────────

export async function getSummary(req: Request, res: Response): Promise<void> {
  const { date } = req.query as { date?: string }

  const day = date ? new Date(date) : new Date()
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            variant: { include: { product: { select: { name: true } } } },
          },
        },
      },
    })

    const totalSales = transactions.reduce((s, t) => s + Number(t.total), 0)
    const transactionCount = transactions.length
    const averageTransactionValue = transactionCount ? totalSales / transactionCount : 0

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {}
    for (const t of transactions) {
      paymentBreakdown[t.paymentMethod] = (paymentBreakdown[t.paymentMethod] ?? 0) + Number(t.total)
    }

    // Product stats
    const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {}
    for (const t of transactions) {
      for (const item of t.items) {
        const name = item.variant.product.name
        if (!productRevenue[name]) productRevenue[name] = { name, revenue: 0, units: 0 }
        productRevenue[name].revenue += Number(item.lineTotal)
        productRevenue[name].units += item.quantity
      }
    }

    const sorted = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue)

    res.json({
      data: {
        totalSales,
        transactionCount,
        averageTransactionValue,
        topProductsByRevenue: sorted.slice(0, 5).map((p) => ({ name: p.name, revenue: p.revenue })),
        topProductsByUnits: [...sorted].sort((a, b) => b.units - a.units).slice(0, 5).map((p) => ({ name: p.name, units: p.units })),
        paymentBreakdown,
      },
    })
  } catch (err) {
    console.error('[transactions] getSummary error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /transactions ────────────────────────────────────────────────────────

export async function listTransactions(req: Request, res: Response): Promise<void> {
  const { date, limit = '20', page = '1' } = req.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = {}
  if (date) {
    const day = new Date(date)
    const start = new Date(day); start.setHours(0, 0, 0, 0)
    const end = new Date(day); end.setHours(23, 59, 59, 999)
    where.createdAt = { gte: start, lte: end }
  }

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          staff: { select: { name: true } },
          items: {
            include: {
              variant: { include: { product: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ])

    res.json({ data: transactions.map(serializeTransaction), total, page: pageNum, limit: limitNum })
  } catch (err) {
    console.error('[transactions] listTransactions error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── Serializer ───────────────────────────────────────────────────────────────

function serializeTransaction(t: Record<string, unknown>): unknown {
  return {
    ...t,
    subtotal: Number(t.subtotal),
    discountAmount: Number(t.discountAmount),
    total: Number(t.total),
    items: Array.isArray(t.items)
      ? (t.items as Array<Record<string, unknown>>).map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
        }))
      : undefined,
  }
}
