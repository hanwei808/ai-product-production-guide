'use client'

import { Layout, Typography, Space, Tooltip } from 'antd'
import { GithubOutlined, BookOutlined, MenuOutlined, CloseOutlined, SunOutlined, MoonOutlined, UnorderedListOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useTheme } from '@/lib/ThemeContext'

const { Header: AntHeader } = Layout
const { Title } = Typography

interface HeaderProps {
  onMenuClick?: () => void
  mobileMenuOpen?: boolean
  onTocClick?: () => void
  mobileTocOpen?: boolean
}

export function Header({ onMenuClick, mobileMenuOpen, onTocClick, mobileTocOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <AntHeader
      className="app-header"
      style={{
        background: theme === 'light' 
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)' 
          : 'linear-gradient(135deg, rgba(45, 45, 50, 0.3) 0%, rgba(30, 30, 35, 0.25) 100%)',
        backdropFilter: 'saturate(200%) blur(40px)',
        WebkitBackdropFilter: 'saturate(200%) blur(40px)',
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
          ? '1px solid rgba(255, 255, 255, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: theme === 'light'
          ? '0 4px 30px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          : '0 4px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
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
        {/* GitHub 链接 - 桌面端显示 */}
        <a
          href="https://github.com/hanwei808/ai-product-production-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link hide-mobile"
          style={{ 
            color: theme === 'light' ? '#1d1d1f' : '#f5f5f7', 
            fontSize: 20, 
            display: 'none', // 临时隐藏 
            alignItems: 'center',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <GithubOutlined />
        </a>

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

        {/* 移动端目录按钮 */}
        <button
          className="mobile-toc-btn"
          onClick={onTocClick}
          aria-label={mobileTocOpen ? '关闭目录' : '打开目录'}
        >
          {mobileTocOpen ? <CloseOutlined /> : <UnorderedListOutlined />}
        </button>
      </Space>
    </AntHeader>
  )
}
