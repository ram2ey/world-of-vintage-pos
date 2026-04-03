import { StaffRole } from '@world-of-vintage/shared'

// Augment Express Request so req.staff is typed everywhere
declare global {
  namespace Express {
    interface Request {
      staff?: {
        staffId: string
        role: StaffRole
        name: string
      }
    }
  }
}

export {}
