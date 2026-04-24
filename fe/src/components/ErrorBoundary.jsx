import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidMount() {
    sessionStorage.removeItem('webphim_chunk_reload')
  }

  componentDidCatch(error) {
    const message = String(error?.message || error || '')
    const isChunkLoadError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('Loading chunk')

    if (isChunkLoadError && sessionStorage.getItem('webphim_chunk_reload') !== '1') {
      sessionStorage.setItem('webphim_chunk_reload', '1')
      window.location.reload()
      return
    }

    sessionStorage.removeItem('webphim_chunk_reload')
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Ứng dụng bị lỗi</div>
          <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
