import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AccountSecurityPage } from './AccountSecurityPage.jsx'

vi.mock('../../lib/auth.jsx', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: {
      username: 'movie-fan',
      displayName: 'Movie Fan',
      email: 'fan@example.com',
      emailVerified: false,
    },
  }),
}))

vi.mock('../../lib/authApi.js', () => ({
  apiChangePassword: vi.fn(),
  apiResendEmailVerification: vi.fn(),
  apiRevokeAllSessions: vi.fn(),
}))

describe('account security page', () => {
  it('renders password, email verification, and session security controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AccountSecurityPage />
      </MemoryRouter>,
    )

    expect(html).toContain('Bảo mật tài khoản')
    expect(html).toContain('Đổi mật khẩu')
    expect(html).toContain('fan@example.com')
    expect(html).toContain('Chưa xác minh')
    expect(html).toContain('Gửi lại email xác minh')
    expect(html).toContain('Thu hồi tất cả phiên')
    expect(html).not.toContain('Xác nhận thu hồi')
  })
})
