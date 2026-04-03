import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signAccess(staffId: string, role: string, name: string): string {
  return jwt.sign(
    { staffId, role, name },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  )
}

function signRefresh(staffId: string): string {
  return jwt.sign(
    { staffId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
}

// ─── GET /auth/staff ──────────────────────────────────────────────────────────
// Public — returns staff names & IDs for the login page picker.
// Never returns PINs.

export async function listStaff(_req: Request, res: Response): Promise<void> {
  try {
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    })
    res.json({ data: staff })
  } catch (err) {
    console.error('[auth] listStaff error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// body: { staffId: string, pin: string }

export async function login(req: Request, res: Response): Promise<void> {
  const { staffId, pin } = req.body as { staffId?: string; pin?: string }

  if (!staffId || !pin) {
    res.status(400).json({ message: 'staffId and pin are required' })
    return
  }

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    // Use a constant-time comparison regardless of whether staff exists
    const hashToCompare = staff?.pin ?? '$2b$10$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXX'
    const valid = await bcrypt.compare(pin, hashToCompare)

    if (!staff || !staff.isActive || !valid) {
      res.status(401).json({ message: 'Incorrect PIN' })
      return
    }

    const accessToken = signAccess(staff.id, staff.role, staff.name)
    const refreshToken = signRefresh(staff.id)

    res.json({
      data: {
        staff: { id: staff.id, name: staff.name, role: staff.role, isActive: staff.isActive },
        tokens: { accessToken, refreshToken },
      },
    })
  } catch (err) {
    console.error('[auth] login error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
// body: { refreshToken: string }

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string }

  if (!refreshToken) {
    res.status(400).json({ message: 'refreshToken is required' })
    return
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as { staffId: string }

    const staff = await prisma.staff.findUnique({ where: { id: payload.staffId } })

    if (!staff || !staff.isActive) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    const accessToken = signAccess(staff.id, staff.role, staff.name)
    res.json({ data: { accessToken } })
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' })
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Protected — returns the currently authenticated staff member.

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.staff!.staffId },
      select: { id: true, name: true, role: true, isActive: true },
    })
    if (!staff) {
      res.status(404).json({ message: 'Staff not found' })
      return
    }
    res.json({ data: staff })
  } catch (err) {
    console.error('[auth] me error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}
