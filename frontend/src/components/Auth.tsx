import { useState } from 'react'
import type { FormEvent } from 'react'
import { GoogleLogin } from '@react-oauth/google'

const API_URL = 'https://api.morionn.ru/api'

type AuthProps = {
  onLogin: (token: string, username: string) => void
}

function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const endpoint = mode === 'login' ? '/login' : '/register'

    const body = mode === 'login'
      ? { email, password }
      : { username, email, password }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Что-то пошло не так')
        setLoading(false)
        return
      }

      if (mode === 'register') {
        setSuccess('Регистрация успешна! Проверьте почту для подтверждения.')
        setMode('login')
        setLoading(false)
        return
      }

      onLogin(data.token, data.user.username)
    } catch (err) {
      setError('Не удалось связаться с сервером')
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credentialResponse.credential })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка входа через Google')
        setLoading(false)
        return
      }

      onLogin(data.token, data.user.username)
    } catch (err) {
      setError('Не удалось связаться с сервером')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 20, fontFamily: 'Manrope, sans-serif' }}>
      <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>MORION</h1>

      <div style={{ display: 'flex', marginBottom: 20, marginTop: 30 }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          style={{ flex: 1, padding: 10, fontSize: 16, cursor: 'pointer', background: mode === 'login' ? 'var(--accent)' : 'var(--bg-secondary)', color: mode === 'login' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '6px 0 0 6px' }}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(''); setSuccess('') }}
          style={{ flex: 1, padding: 10, fontSize: 16, cursor: 'pointer', background: mode === 'register' ? 'var(--accent)' : 'var(--bg-secondary)', color: mode === 'register' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '0 6px 6px 0' }}
        >
          Регистрация
        </button>
      </div>

      {/* Кнопка входа через Google */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Ошибка входа через Google')}
          text={mode === 'login' ? 'signin_with' : 'signup_with'}
          shape="rectangular"
          theme="outline"
          size="large"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--text-muted)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span>или через email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Имя пользователя (от 3 символов)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            required
            style={{ width: '100%', padding: 12, marginBottom: 12, border: '1px solid var(--border-input)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          required
          style={{ width: '100%', padding: 12, marginBottom: 12, border: '1px solid var(--border-input)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <input
          type="password"
          placeholder="Пароль (от 6 символов)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          required
          style={{ width: '100%', padding: 12, marginBottom: 12, border: '1px solid var(--border-input)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />

        {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14, textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: 12, fontSize: 14, textAlign: 'center' }}>{success}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, fontSize: 16, background: loading ? 'var(--text-light)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Подождите...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
        </button>
      </form>

      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
        {mode === 'register' ? 'После регистрации на почту придёт письмо для подтверждения.' : 'Вход по email или через Google.'}
      </p>
    </div>
  )
}

export default Auth
