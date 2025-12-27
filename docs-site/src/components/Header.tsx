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
        background: theme === 'light' 
          ? 'rgba(255, 255, 255, 0.72)' 
          : 'rgba(30, 30, 30, 0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        top: 0,
        height: 'var(--header-height, 64px)',
        borderBottom: theme === 'light'
          ? '1px solid rgba(0, 0, 0, 0.1)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'none',
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
          <Title level={4} className="header-title" style={{ 
            margin: 0, 
            color: theme === 'light' ? '#1d1d1f' : '#f5f5f7',
            fontWeight: 600,
          }}>
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
          style={{ 
            color: theme === 'light' ? '#1d1d1f' : '#f5f5f7', 
            fontSize: 20, 
            display: 'flex', 
            alignItems: 'center',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <GithubOutlined />
        </a>
      </Space>
    </AntHeader>
  )
}
