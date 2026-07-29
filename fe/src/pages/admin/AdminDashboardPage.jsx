import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../lib/auth'
import {
  adminFetchAppHealth,
  adminFetchUsers,
  adminUpdateUserRoles,
  adminRevokeUserSessions,
  adminDeleteUser,
  adminFetchComments,
  adminHideComment,
  adminUnhideComment,
  adminDeleteComment,
  adminFetchCommentReports,
  adminResolveCommentReport,
  adminFetchMailOutbox,
  adminRetryMailOutbox,
  adminRetryAllDeadMailOutbox,
  adminDeleteMailOutbox,
} from '../../lib/authApi'
import './AdminDashboardPage.css'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('health') // 'health' | 'users' | 'comments' | 'reports' | 'outbox'
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Admin Dashboard</h1>
          <p className="admin-header-subtitle">Quản trị hệ thống WebPhim</p>
        </div>
        <div className="admin-user-info">
          <span className="admin-badge">Admin</span>
          <span className="admin-username">{user?.displayName || user?.username}</span>
        </div>
      </div>

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          <span className="tab-icon">⚡</span> Health App
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">👥</span> Quản lý User
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <span className="tab-icon">💬</span> Quản lý Bình luận
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">🚩</span> Báo cáo Bình luận
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'outbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('outbox')}
        >
          <span className="tab-icon">✉️</span> Mail Outbox Lỗi
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-tab-content">
        {activeTab === 'health' && <HealthTab showToast={showToast} />}
        {activeTab === 'users' && <UsersTab showToast={showToast} currentUserId={user?.id} />}
        {activeTab === 'comments' && <CommentsTab showToast={showToast} />}
        {activeTab === 'reports' && <CommentReportsTab showToast={showToast} />}
        {activeTab === 'outbox' && <OutboxTab showToast={showToast} />}
      </div>
    </div>
  )
}

// --- TAB 1: HEALTH APP ---
function HealthTab({ showToast }) {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchAppHealth()
      setHealthData(data)
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin Health app')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHealth()
    const interval = setInterval(loadHealth, 15000)
    return () => clearInterval(interval)
  }, [loadHealth])

  if (loading && !healthData) {
    return <div className="admin-loading">Đang kiểm tra hệ thống...</div>
  }

  if (error && !healthData) {
    return (
      <div className="admin-error-box">
        <p>{error}</p>
        <button className="admin-btn admin-btn-primary" onClick={loadHealth}>Thử lại</button>
      </div>
    )
  }

  const { status, database, outbox, metrics } = healthData || {}
  const statusClass = status === 'UP' ? 'status-up' : status === 'DEGRADED' ? 'status-degraded' : 'status-down'
  const statusText = status === 'UP' ? 'HOẠT ĐỘNG TỐT (UP)' : status === 'DEGRADED' ? 'CẢNH BÁO (DEGRADED)' : 'SỰ CỐ (DOWN)'

  const formatUptime = (ms) => {
    if (!ms) return '0s'
    const totalSecs = Math.floor(ms / 1000)
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hours}h ${mins}m ${secs}s`
  }

  const memoryPercent = metrics?.jvmMemoryTotalMb ? Math.round((metrics.jvmMemoryUsedMb / metrics.jvmMemoryTotalMb) * 100) : 0

  return (
    <div className="health-section">
      <div className="health-top-bar">
        <h2>Trạng thái hệ thống</h2>
        <button className="admin-btn admin-btn-secondary" onClick={() => { loadHealth(); showToast('Đã làm mới thông tin Health', 'success') }}>
          🔄 Làm mới ngay
        </button>
      </div>

      <div className="health-grid">
        {/* Main Status */}
        <div className={`health-card ${statusClass}`}>
          <div className="card-header">Trạng thái chung</div>
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-title">{statusText}</span>
          </div>
          <p className="card-desc">Uptime: {formatUptime(metrics?.uptimeMs)}</p>
        </div>

        {/* Database Status */}
        <div className="health-card">
          <div className="card-header">MongoDB Database</div>
          <div className="card-main-val">
            {database?.status === 'UP' ? (
              <span className="text-success">🟢 UP</span>
            ) : (
              <span className="text-danger">🔴 DOWN</span>
            )}
          </div>
          <p className="card-desc">Database: {database?.databaseName || 'N/A'}</p>
        </div>

        {/* Mail Queue Status */}
        <div className="health-card">
          <div className="card-header">Hàng chờ Mail Outbox</div>
          <div className="outbox-mini-stats">
            <div className="mini-stat">
              <span className="lbl">Mail Lỗi (Dead):</span>
              <span className={`val ${outbox?.dead > 0 ? 'text-danger font-bold' : ''}`}>{outbox?.dead ?? 0}</span>
            </div>
            <div className="mini-stat">
              <span className="lbl">Đang chờ (Pending):</span>
              <span className="val">{outbox?.pending ?? 0}</span>
            </div>
            <div className="mini-stat">
              <span className="lbl">Đã gửi (Sent):</span>
              <span className="val">{outbox?.sent ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Memory Metrics */}
        <div className="health-card">
          <div className="card-header">Bộ nhớ JVM RAM</div>
          <div className="card-main-val">{metrics?.jvmMemoryUsedMb ?? 0} MB / {metrics?.jvmMemoryTotalMb ?? 0} MB</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${memoryPercent}%` }}></div>
          </div>
          <p className="card-desc">Max Heap: {metrics?.jvmMemoryMaxMb ?? 0} MB ({memoryPercent}% đã dùng)</p>
        </div>
      </div>

      {/* System Quick Numbers */}
      <h3 className="section-subtitle">Tổng quan dữ liệu</h3>
      <div className="metrics-summary-grid">
        <div className="metric-box">
          <div className="metric-icon">👥</div>
          <div className="metric-data">
            <span className="metric-val">{metrics?.totalUsers ?? 0}</span>
            <span className="metric-lbl">Người dùng ({metrics?.adminUsers ?? 0} Admin)</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon">💬</div>
          <div className="metric-data">
            <span className="metric-val">{metrics?.totalComments ?? 0}</span>
            <span className="metric-lbl">Bình luận ({metrics?.hiddenComments ?? 0} đã ẩn)</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon">⚙️</div>
          <div className="metric-data">
            <span className="metric-val">{metrics?.availableProcessors ?? 1} Cores</span>
            <span className="metric-lbl">CPU Cores khả dụng</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- TAB 2: USER MANAGEMENT ---
function UsersTab({ showToast, currentUserId }) {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedUserForRole, setSelectedUserForRole] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetchUsers({ search, role: roleFilter, page, size: 15 })
      setUsers(res.items || [])
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems || 0)
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách người dùng', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, page, showToast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleRoleToggle = async (targetUser, roleToToggle) => {
    setActionLoading(true)
    const currentRoles = targetUser.roles || ['USER']
    let newRoles
    if (currentRoles.includes(roleToToggle)) {
      newRoles = currentRoles.filter(r => r !== roleToToggle)
    } else {
      newRoles = [...currentRoles, roleToToggle]
    }
    if (newRoles.length === 0) newRoles = ['USER']

    try {
      await adminUpdateUserRoles(targetUser.id, newRoles)
      showToast(`Đã cập nhật vai trò cho ${targetUser.username}`, 'success')
      setSelectedUserForRole(null)
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Cập nhật vai trò thất bại', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeSessions = async (targetUser) => {
    if (!window.confirm(`Bạn có chắc muốn thu hồi toàn bộ phiên đăng nhập của ${targetUser.username}?`)) return
    try {
      await adminRevokeUserSessions(targetUser.id)
      showToast(`Đã đăng xuất toàn bộ thiết bị của ${targetUser.username}`, 'success')
    } catch (err) {
      showToast(err.message || 'Thu hồi phiên đăng nhập thất bại', 'error')
    }
  }

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === currentUserId) {
      showToast('Bạn không thể xóa tài khoản của chính mình!', 'error')
      return
    }
    if (!window.confirm(`HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC! Xóa người dùng ${targetUser.username}?`)) return
    try {
      await adminDeleteUser(targetUser.id)
      showToast(`Đã xóa tài khoản ${targetUser.username}`, 'success')
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Xóa tài khoản thất bại', 'error')
    }
  }

  return (
    <div className="users-section">
      {/* Controls */}
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm theo username, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="filter-box">
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
            <option value="">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
            <option value="USER">Thành viên (USER)</option>
          </select>
        </div>
        <div className="total-count">Tổng cộng: <strong>{totalItems}</strong> tài khoản</div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">Đang tải danh sách người dùng...</div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Email</th>
                <th>Xác minh</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">Không tìm thấy người dùng nào</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-avatar-cell">
                        <div className="avatar-circle">{(u.displayName || u.username)[0]?.toUpperCase()}</div>
                        <div>
                          <div className="font-bold">{u.displayName || u.username}</div>
                          <div className="text-muted">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.email || 'Chưa cập nhật'}</td>
                    <td>
                      {u.emailVerified ? (
                        <span className="badge badge-success">✓ Đã xác minh</span>
                      ) : (
                        <span className="badge badge-warning">Chưa xác minh</span>
                      )}
                    </td>
                    <td>
                      {u.roles?.map(r => (
                        <span key={r} className={`badge ${r === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                          {r}
                        </span>
                      ))}
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-icon"
                          title="Phân quyền"
                          onClick={() => setSelectedUserForRole(u)}
                        >
                          👑 Vai trò
                        </button>
                        <button
                          className="btn-icon btn-icon-warning"
                          title="Đăng xuất thiết bị"
                          onClick={() => handleRevokeSessions(u)}
                        >
                          🔒 Revoke
                        </button>
                        {u.id !== currentUserId && (
                          <button
                            className="btn-icon btn-icon-danger"
                            title="Xóa người dùng"
                            onClick={() => handleDeleteUser(u)}
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</button>
          <span>Trang {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Trang sau</button>
        </div>
      )}

      {/* Role Modal */}
      {selectedUserForRole && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUserForRole(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Cập nhật vai trò: {selectedUserForRole.username}</h3>
            <p className="text-muted">Tích chọn vai trò bạn muốn gán cho tài khoản này:</p>
            <div className="role-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedUserForRole.roles?.includes('ADMIN')}
                  disabled={actionLoading}
                  onChange={() => handleRoleToggle(selectedUserForRole, 'ADMIN')}
                />
                <span className="font-bold">ADMIN</span> - Quyền Quản trị toàn hệ thống
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedUserForRole.roles?.includes('USER')}
                  disabled={actionLoading}
                  onChange={() => handleRoleToggle(selectedUserForRole, 'USER')}
                />
                <span className="font-bold">USER</span> - Quyền Thành viên thông thường
              </label>
            </div>
            <div className="modal-actions">
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedUserForRole(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- TAB 3: COMMENT MODERATION ---
function CommentsTab({ showToast }) {
  const [comments, setComments] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState('')
  const [hiddenFilter, setHiddenFilter] = useState('') // '' | 'true' | 'false'
  const [loading, setLoading] = useState(false)

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const hiddenVal = hiddenFilter === '' ? null : hiddenFilter === 'true'
      const res = await adminFetchComments({ search, hidden: hiddenVal, page, size: 15 })
      setComments(res.items || [])
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems || 0)
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách bình luận', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, hiddenFilter, page, showToast])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleToggleHide = async (comment) => {
    try {
      if (comment.hidden) {
        await adminUnhideComment(comment.id)
        showToast('Đã hiện lại bình luận', 'success')
      } else {
        await adminHideComment(comment.id)
        showToast('Đã ẩn bình luận thành công', 'success')
      }
      loadComments()
    } catch (err) {
      showToast(err.message || 'Thao tác ẩn/hiện thất bại', 'error')
    }
  }

  const handleDelete = async (comment) => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN bình luận này?')) return
    try {
      await adminDeleteComment(comment.id)
      showToast('Đã xóa bình luận', 'success')
      loadComments()
    } catch (err) {
      showToast(err.message || 'Xóa bình luận thất bại', 'error')
    }
  }

  return (
    <div className="comments-section">
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm theo nội dung, tên người dùng, slug phim..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="filter-box">
          <select value={hiddenFilter} onChange={(e) => { setHiddenFilter(e.target.value); setPage(0); }}>
            <option value="">Tất cả trạng thái</option>
            <option value="false">Đang hiển thị</option>
            <option value="true">Đã ẩn (Hidden)</option>
          </select>
        </div>
        <div className="total-count">Tổng cộng: <strong>{totalItems}</strong> bình luận</div>
      </div>

      {loading ? (
        <div className="admin-loading">Đang tải danh sách bình luận...</div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Phim Slug</th>
                <th>Người đăng</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">Không tìm thấy bình luận nào</td>
                </tr>
              ) : (
                comments.map((c) => (
                  <tr key={c.id} className={c.hidden ? 'row-hidden' : ''}>
                    <td>
                      <code className="slug-code">{c.movieSlug}</code>
                    </td>
                    <td>
                      <div className="font-bold">{c.displayName || c.username}</div>
                      <div className="text-muted">@{c.username}</div>
                    </td>
                    <td className="content-cell">
                      <p className="comment-text-preview">{c.content}</p>
                    </td>
                    <td>
                      {c.hidden ? (
                        <span className="badge badge-danger">🚫 Đã ẩn</span>
                      ) : (
                        <span className="badge badge-success">👁️ Hiển thị</span>
                      )}
                    </td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className={`btn-icon ${c.hidden ? 'btn-icon-success' : 'btn-icon-warning'}`}
                          onClick={() => handleToggleHide(c)}
                        >
                          {c.hidden ? '👁️ Hiện' : '🙈 Ẩn'}
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(c)}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</button>
          <span>Trang {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Trang sau</button>
        </div>
      )}
    </div>
  )
}

// --- TAB 4: MAIL OUTBOX ERRORS ---
function OutboxTab({ showToast }) {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState({})
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('DEAD') // Default filter to DEAD (lỗi)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadOutbox = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetchMailOutbox({ status: statusFilter, page, size: 15 })
      setEntries(res.items || [])
      setStats(res.stats || {})
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      showToast(err.message || 'Không thể tải Mail Outbox', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, showToast])

  useEffect(() => {
    loadOutbox()
  }, [loadOutbox])

  const handleRetrySingle = async (id) => {
    setActionLoading(true)
    try {
      await adminRetryMailOutbox(id)
      showToast('Đã xếp hàng gửi lại email này!', 'success')
      loadOutbox()
    } catch (err) {
      showToast(err.message || 'Gửi lại email thất bại', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryAllDead = async () => {
    if (!window.confirm(`Bạn muốn thử gửi lại tất cả (${stats.dead || 0}) email bị lỗi?`)) return
    setActionLoading(true)
    try {
      const res = await adminRetryAllDeadMailOutbox()
      showToast(`Đã khôi phục ${res.retriedCount || 0} mail lỗi về trạng thái Đang chờ (Pending)`, 'success')
      loadOutbox()
    } catch (err) {
      showToast(err.message || 'Không thể gửi lại tất cả mail lỗi', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bản ghi outbox này?')) return
    try {
      await adminDeleteMailOutbox(id)
      showToast('Đã xóa log mail outbox', 'success')
      loadOutbox()
    } catch (err) {
      showToast(err.message || 'Xóa log mail thất bại', 'error')
    }
  }

  return (
    <div className="outbox-section">
      {/* Top Stats Banner */}
      <div className="outbox-stats-banner">
        <div className="stat-card stat-dead" onClick={() => { setStatusFilter('DEAD'); setPage(0); }}>
          <span className="num">{stats.dead ?? 0}</span>
          <span className="lbl">Mail lỗi (DEAD)</span>
        </div>
        <div className="stat-card stat-pending" onClick={() => { setStatusFilter('PENDING'); setPage(0); }}>
          <span className="num">{stats.pending ?? 0}</span>
          <span className="lbl">Đang chờ (PENDING)</span>
        </div>
        <div className="stat-card stat-sending" onClick={() => { setStatusFilter('SENDING'); setPage(0); }}>
          <span className="num">{stats.sending ?? 0}</span>
          <span className="lbl">Đang gửi (SENDING)</span>
        </div>
        <div className="stat-card stat-sent" onClick={() => { setStatusFilter('SENT'); setPage(0); }}>
          <span className="num">{stats.sent ?? 0}</span>
          <span className="lbl">Đã gửi (SENT)</span>
        </div>
        <div className="stat-card stat-total" onClick={() => { setStatusFilter(''); setPage(0); }}>
          <span className="num">{stats.total ?? 0}</span>
          <span className="lbl">Tất cả bản ghi</span>
        </div>
      </div>

      {/* Action Header */}
      <div className="table-controls">
        <div className="filter-tabs-inline">
          <button className={statusFilter === 'DEAD' ? 'active-filter' : ''} onClick={() => { setStatusFilter('DEAD'); setPage(0); }}>Lỗi (DEAD)</button>
          <button className={statusFilter === 'PENDING' ? 'active-filter' : ''} onClick={() => { setStatusFilter('PENDING'); setPage(0); }}>Đang chờ</button>
          <button className={statusFilter === 'SENT' ? 'active-filter' : ''} onClick={() => { setStatusFilter('SENT'); setPage(0); }}>Đã gửi</button>
          <button className={statusFilter === '' ? 'active-filter' : ''} onClick={() => { setStatusFilter(''); setPage(0); }}>Tất cả</button>
        </div>

        {(stats.dead > 0 || statusFilter === 'DEAD') && (
          <button
            className="admin-btn admin-btn-warning"
            disabled={actionLoading || stats.dead === 0}
            onClick={handleRetryAllDead}
          >
            🚀 Thử gửi lại tất cả mail lỗi ({stats.dead || 0})
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-loading">Đang tải danh sách mail outbox...</div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người nhận</th>
                <th>Tiêu đề</th>
                <th>Trạng thái</th>
                <th>Thử lại</th>
                <th>Chi tiết lỗi</th>
                <th>Thời gian</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">Không có email nào trong danh sách này</td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-bold">{item.recipient}</div>
                    </td>
                    <td>{item.subject}</td>
                    <td>
                      <span className={`badge ${
                        item.status === 'DEAD' ? 'badge-danger' :
                        item.status === 'PENDING' ? 'badge-warning' :
                        item.status === 'SENT' ? 'badge-success' : 'badge-neutral'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.attempts} lần</td>
                    <td className="error-cell">
                      {item.lastError ? (
                        <div className="error-text" title={item.lastError}>{item.lastError}</div>
                      ) : (
                        <span className="text-muted">Không có lỗi</span>
                      )}
                    </td>
                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                    <td>
                      <div className="action-btns">
                        {(item.status === 'DEAD' || item.status === 'PENDING') && (
                          <button
                            className="btn-icon btn-icon-success"
                            disabled={actionLoading}
                            onClick={() => handleRetrySingle(item.id)}
                          >
                            🔄 Gửi lại
                          </button>
                        )}
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</button>
          <span>Trang {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Trang sau</button>
        </div>
      )}
    </div>
  )
}

// --- TAB 5: COMMENT REPORTS MODERATION ---
function CommentReportsTab({ showToast }) {
  const [reports, setReports] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetchCommentReports({ search, status: statusFilter, page, size: 15 })
      setReports(res.items || [])
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems || 0)
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách báo cáo', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page, showToast])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleAction = async (report, action) => {
    let confirmText = ''
    if (action === 'HIDE') confirmText = 'Ẩn bình luận này và đánh dấu báo cáo là Đã xử lý?'
    else if (action === 'DELETE') confirmText = 'XÓA VĨNH VIỄN bình luận này?'
    else if (action === 'DISMISS') confirmText = 'Bác bỏ báo cáo này (bình luận sẽ giữ nguyên)?'

    if (!window.confirm(confirmText)) return

    setActionLoading(true)
    try {
      await adminResolveCommentReport(report.id, action)
      showToast('Đã xử lý báo cáo thành công!', 'success')
      loadReports()
    } catch (err) {
      showToast(err.message || 'Xử lý báo cáo thất bại', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const reasonLabel = (reason) => {
    switch (reason) {
      case 'SPAM': return 'Spam / Quảng cáo'
      case 'INAPPROPRIATE': return 'Ngôn từ thù ghét'
      case 'HARASSMENT': return 'Xúc phạm / Bắt nạt'
      case 'MISINFORMATION': return 'Tin sai sự thật'
      default: return reason || 'Khác'
    }
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning">⏳ Đang chờ</span>
      case 'RESOLVED_HIDDEN':
        return <span className="badge badge-success">🙈 Đã ẩn bình luận</span>
      case 'RESOLVED_DELETED':
        return <span className="badge badge-danger">🗑️ Đã xóa bình luận</span>
      case 'DISMISSED':
        return <span className="badge badge-neutral">✖️ Đã bác bỏ</span>
      case 'PROCESSING':
        return <span className="badge badge-warning">⚙️ Đang xử lý</span>
      case 'COMMENT_NOT_FOUND':
        return <span className="badge badge-neutral">ℹ️ Bình luận không còn tồn tại</span>
      case 'RESOLUTION_FAILED':
        return <span className="badge badge-danger">⚠️ Xử lý thất bại</span>
      default:
        return <span className="badge badge-neutral">{status}</span>
    }
  }

  return (
    <div className="reports-section">
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm theo nội dung, người báo cáo, người bị báo cáo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="filter-box">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">⏳ Đang chờ xử lý</option>
            <option value="RESOLVED_HIDDEN">🙈 Đã ẩn bình luận</option>
            <option value="RESOLVED_DELETED">🗑️ Đã xóa bình luận</option>
            <option value="DISMISSED">✖️ Đã bác bỏ</option>
            <option value="PROCESSING">⚙️ Đang xử lý</option>
            <option value="COMMENT_NOT_FOUND">ℹ️ Bình luận không còn tồn tại</option>
            <option value="RESOLUTION_FAILED">⚠️ Xử lý thất bại</option>
          </select>
        </div>
        <div className="total-count">Tổng cộng: <strong>{totalItems}</strong> báo cáo</div>
      </div>

      {loading ? (
        <div className="admin-loading">Đang tải danh sách báo cáo...</div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người báo cáo</th>
                <th>Tác giả bình luận</th>
                <th>Nội dung bị báo cáo</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">Không có báo cáo nào trong danh sách này</td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-bold">@{r.reporterUsername}</div>
                    </td>
                    <td>
                      <div className="font-bold">@{r.reportedUsername}</div>
                      <div className="text-muted"><code className="slug-code">{r.movieSlug}</code></div>
                    </td>
                    <td className="content-cell">
                      <p className="comment-text-preview">"{r.commentContent}"</p>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{reasonLabel(r.reason)}</span>
                      {r.details ? <div className="text-muted text-xs mt-1">{r.details}</div> : null}
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'N/A'}</td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <div className="action-btns">
                          <button
                            className="btn-icon btn-icon-warning"
                            disabled={actionLoading}
                            title="Ẩn bình luận"
                            onClick={() => handleAction(r, 'HIDE')}
                          >
                            🙈 Ẩn
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            disabled={actionLoading}
                            title="Xóa vĩnh viễn"
                            onClick={() => handleAction(r, 'DELETE')}
                          >
                            🗑️ Xóa
                          </button>
                          <button
                            className="btn-icon"
                            disabled={actionLoading}
                            title="Bác bỏ báo cáo"
                            onClick={() => handleAction(r, 'DISMISS')}
                          >
                            ✖️ Bác bỏ
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</button>
          <span>Trang {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Trang sau</button>
        </div>
      )}
    </div>
  )
}
