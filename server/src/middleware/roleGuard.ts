import { Request, Response, NextFunction } from 'express'
import type { StaffRole } from '@world-of-vintage/shared'

// Managers outrank cashiers — a manager can do anything a cashier can.
const RANK: Record<StaffRole, number> = { cashier: 1, manager: 2 }

export function requireRole(minRole: StaffRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staff) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }
    if (RANK[req.staff.role] < RANK[minRole]) {
      res.status(403).json({ message: 'Insufficient permissions' })
      return
    }
    next()
  }
}
