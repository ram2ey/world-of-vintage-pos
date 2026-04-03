import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Delete, ArrowRight, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import type { Staff, AuthTokens } from '@world-of-vintage/shared'

type StaffOption = Pick<Staff, 'id' | 'name' | 'role'>
type Step = 'select-staff' | 'enter-pin'

const PIN_LENGTH = 4

export default function Login() {
  const navigate = useNavigate()
  const { login, staff: currentStaff } = useAuthStore()

  const [step, setStep] = useState<Step>('select-staff')
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [selected, setSelected] = useState<StaffOption | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already logged in → go straight to sell
  useEffect(() => {
    if (currentStaff) navigate('/sell', { replace: true })
  }, [currentStaff, navigate])

  // Fetch staff list for the picker
  useEffect(() => {
    api
      .get<{ data: StaffOption[] }>('/auth/staff')
      .then((res) => setStaffList(res.data.data))
      .catch(() => setError('Could not load staff list. Is the server running?'))
  }, [])

  // Submit PIN
  const handleSubmit = useCallback(
    async (pinValue: string) => {
      if (!selected || pinValue.length !== PIN_LENGTH || loading) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.post<{ data: { staff: Staff; tokens: AuthTokens } }>('/auth/login', {
          staffId: selected.id,
          pin: pinValue,
        })
        login(res.data.data.staff, res.data.data.tokens)
        navigate('/sell', { replace: true })
      } catch {
        setError('Incorrect PIN. Try again.')
        setPin('')
      } finally {
        setLoading(false)
      }
    },
    [selected, loading, login, navigate]
  )

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === PIN_LENGTH) handleSubmit(pin)
  }, [pin, handleSubmit])

  // Physical keyboard support
  useEffect(() => {
    if (step !== 'enter-pin') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setPin((p) => (p.length < PIN_LENGTH ? p + e.key : p))
      } else if (e.key === 'Backspace') {
        setPin((p) => p.slice(0, -1))
        setError(null)
      } else if (e.key === 'Enter') {
        handleSubmit(pin)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, pin, handleSubmit])

  function selectStaff(staff: StaffOption) {
    setSelected(staff)
    setPin('')
    setError(null)
    setStep('enter-pin')
  }

  function pressDigit(d: string) {
    if (pin.length < PIN_LENGTH && !loading) {
      setPin((p) => p + d)
      setError(null)
    }
  }

  function pressBack() {
    setPin((p) => p.slice(0, -1))
    setError(null)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">
            Point of Sale
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">World of Vintage</h1>
        </div>

        {/* ── Step 1: staff picker ─────────────────────────────────────── */}
        {step === 'select-staff' && (
          <>
            <p className="text-sm font-medium text-gray-500 mb-3">Who's selling today?</p>
            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}
            <div className="space-y-2">
              {staffList.length === 0 && !error && (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              )}
              {staffList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectStaff(s)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px] text-left"
                >
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      s.role === 'manager'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.role}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: PIN entry ────────────────────────────────────────── */}
        {step === 'enter-pin' && selected && (
          <>
            {/* Back link */}
            <button
              onClick={() => { setStep('select-staff'); setPin(''); setError(null) }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-8 min-h-[44px]"
            >
              <ChevronLeft size={16} />
              <span>{selected.name}</span>
            </button>

            <p className="text-sm font-medium text-gray-500 mb-6 text-center">Enter your PIN</p>

            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-8">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-colors duration-100 ${
                    i < pin.length ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 text-center mb-4">{error}</p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  disabled={loading}
                  className="flex items-center justify-center h-16 border border-gray-200 rounded-lg text-xl font-medium text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40 select-none"
                >
                  {d}
                </button>
              ))}

              {/* Backspace */}
              <button
                onClick={pressBack}
                disabled={loading || pin.length === 0}
                className="flex items-center justify-center h-16 border border-gray-200 rounded-lg text-gray-500 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40 select-none"
                aria-label="Delete"
              >
                <Delete size={20} />
              </button>

              {/* 0 */}
              <button
                onClick={() => pressDigit('0')}
                disabled={loading}
                className="flex items-center justify-center h-16 border border-gray-200 rounded-lg text-xl font-medium text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40 select-none"
              >
                0
              </button>

              {/* Submit */}
              <button
                onClick={() => handleSubmit(pin)}
                disabled={loading || pin.length !== PIN_LENGTH}
                className="flex items-center justify-center h-16 border border-gray-900 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-40 select-none"
                aria-label="Login"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
