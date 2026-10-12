import { useState } from 'react'
import type { FormEvent } from 'react'

const API_URL = 'https://api.morionn.ru/api'

type AuthProps = {
  onLogin: (token: string, username: string) => void
}

function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = mode === 'login' ? '/login' : '/register'

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Что-то пошло не так')
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
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Моя соцсеть</h1>

      <div style={{ display: 'flex', marginBottom: 20 }}>
        <button
          onClick={() => { setMode('login'); setError('') }}
          style={{
            flex: 1, padding: 10, fontSize: 16, cursor: 'pointer',
            background: mode === 'login' ? '#007bff' : '#eee',
            color: mode === 'login' ? '#fff' : '#333',
            border: 'none', borderRadius: '4px 0 0 4px'
          }}
        >
          Вход
        </button>
        <button
          onClick={() => { setMode('register'); setError('') }}
          style={{
            flex: 1, padding: 10, fontSize: 16, cursor: 'pointer',
            background: mode === 'register' ? '#007bff' : '#eee',
            color: mode === 'register' ? '#fff' : '#333',
            border: 'none', borderRadius: '0 4px 4px 0'
          }}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
          style={{
            width: '100%', padding: 10, marginBottom: 12,
            border: '1px solid #ccc', borderRadius: 4,
            fontSize: 14, boxSizing: 'border-box'
          }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          style={{
            width: '100%', padding: 10, marginBottom: 12,
            border: '1px solid #ccc', borderRadius: 4,
            fontSize: 14, boxSizing: 'border-box'
          }}
        />

        {error && (
          <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: 12, fontSize: 16,
            background: loading ? '#999' : '#007bff', color: '#fff',
            border: 'none', borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Подождите...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
        </button>
      </form>

      <p style={{ color: '#888', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
        {mode === 'register' ? 'Имя от 3 символов, пароль от 6' : ''}
      </p>
    </div>
  )
}

export default Auth
