import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { StaffRole } from '@world-of-vintage/shared'

interface JwtPayload {
  staffId: string
  role: StaffRole
  name: string
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' })
    return
  }

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET missing' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload
    req.staff = { staffId: payload.staffId, role: payload.role, name: payload.name }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
