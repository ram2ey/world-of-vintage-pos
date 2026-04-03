import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// ─── GET /customers ───────────────────────────────────────────────────────────

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const { search } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 20,
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: { visitedAt: true },
        },
      },
    })

    res.json({
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        preferredSizes: c.preferredSizes,
        styleNotes: c.styleNotes,
        createdAt: c.createdAt,
        visitCount: c._count.visits,
        lastVisit: c.visits[0]?.visitedAt ?? null,
      })),
    })
  } catch (err) {
    console.error('[customers] listCustomers error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /customers/:id ───────────────────────────────────────────────────────

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: { visitedAt: true },
        },
      },
    })

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' })
      return
    }

    res.json({
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        preferredSizes: customer.preferredSizes,
        styleNotes: customer.styleNotes,
        createdAt: customer.createdAt,
        visitCount: customer._count.visits,
        lastVisit: customer.visits[0]?.visitedAt ?? null,
      },
    })
  } catch (err) {
    console.error('[customers] getCustomer error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── GET /customers/:id/history ───────────────────────────────────────────────

export async function getCustomerHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params

  try {
    const transactions = await prisma.transaction.findMany({
      where: { customerId: id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true } } },
            },
          },
        },
      },
    })

    res.json({
      data: transactions.map((t) => ({
        id: t.id,
        receiptNumber: t.receiptNumber,
        total: Number(t.total),
        subtotal: Number(t.subtotal),
        discountAmount: Number(t.discountAmount),
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        items: t.items.map((i) => ({
          id: i.id,
          productName: i.variant.product.name,
          size: i.variant.size,
          color: i.variant.color,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
        })),
      })),
    })
  } catch (err) {
    console.error('[customers] getCustomerHistory error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── POST /customers ──────────────────────────────────────────────────────────

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const { name, phone, email, preferredSizes, styleNotes } = req.body

  if (!name || !phone) {
    res.status(400).json({ message: 'name and phone are required' })
    return
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        preferredSizes: preferredSizes ?? [],
        styleNotes,
      },
    })

    res.status(201).json({
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        preferredSizes: customer.preferredSizes,
        styleNotes: customer.styleNotes,
        createdAt: customer.createdAt,
        visitCount: 0,
        lastVisit: null,
      },
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ message: 'A customer with this phone number already exists' })
      return
    }
    console.error('[customers] createCustomer error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── PUT /customers/:id ───────────────────────────────────────────────────────

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { name, phone, email, preferredSizes, styleNotes } = req.body

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, email, preferredSizes, styleNotes },
    })

    res.json({
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        preferredSizes: customer.preferredSizes,
        styleNotes: customer.styleNotes,
        createdAt: customer.createdAt,
      },
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ message: 'Customer not found' })
      return
    }
    console.error('[customers] updateCustomer error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}
