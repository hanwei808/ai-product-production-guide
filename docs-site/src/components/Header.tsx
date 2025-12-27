'use client'

import { Layout, Typography, Space, Tooltip } from 'antd'
import { GithubOutlined, BookOutlined, MenuOutlined, CloseOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useTheme } from '@/lib/ThemeContext'

const { Header: AntHeader } = Layout
const { Title } = Typography

interface HeaderProps {
  onMenuClick?: () => void
  mobileMenuOpen?: boolean
}

export function Header({ onMenuClick, mobileMenuOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <AntHeader
      className="app-header"
      style={{
        background: 'var(--header-bg, linear-gradient(135deg, #1e293b 0%, #0f172a 100%))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        top: 0,
        height: 'var(--header-height, 64px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 移动端菜单按钮 */}
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
        
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BookOutlined className="header-logo" style={{ fontSize: 24, color: '#3b82f6' }} />
          <Title level={4} className="header-title" style={{ margin: 0, color: '#fff' }}>
            AI 产品生产指南
          </Title>
        </Link>
      </div>
      
      <Space size="middle">
        {/* 主题切换按钮 */}
        <Tooltip title={theme === 'light' ? '切换到夜间模式' : '切换到白天模式'}>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? '切换到夜间模式' : '切换到白天模式'}
          >
            {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          </button>
        </Tooltip>
        
        <a
          href="https://github.com/hanwei808/ai-product-production-guide"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center' }}
        >
          <GithubOutlined />
        </a>
      </Space>
    </AntHeader>
  )
}
