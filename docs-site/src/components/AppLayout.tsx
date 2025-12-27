'use client'

import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, theme as antTheme } from 'antd'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { useTheme } from '@/lib/ThemeContext'

const { Content, Sider } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // 监听窗口大小变化
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 移动端菜单打开时禁止滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgContainer: theme === 'dark' ? '#1e293b' : '#ffffff',
          colorBgElevated: theme === 'dark' ? '#334155' : '#ffffff',
          colorBgLayout: theme === 'dark' ? '#0f172a' : '#f8fafc',
          colorText: theme === 'dark' ? '#f1f5f9' : '#1e293b',
          colorTextSecondary: theme === 'dark' ? '#94a3b8' : '#64748b',
          colorBorder: theme === 'dark' ? '#475569' : '#e2e8f0',
        },
      }}
    >
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header 
          onMenuClick={toggleMobileMenu} 
          mobileMenuOpen={mobileMenuOpen}
        />
        <Layout style={{ marginTop: 'var(--header-height, 64px)', height: 'calc(100vh - var(--header-height, 64px))' }}>
          {/* 移动端遮罩层 */}
          <div 
            className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
            onClick={closeMobileMenu}
          />
          
          <Sider
            width={280}
            collapsedWidth={80}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            className={`app-sider ${mobileMenuOpen ? 'mobile-open' : ''}`}
            style={{
              background: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.72)' 
                : 'rgba(30, 30, 30, 0.72)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              borderRight: theme === 'light'
                ? '1px solid rgba(0, 0, 0, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'auto',
              height: 'calc(100vh - var(--header-height, 64px))',
              position: 'fixed',
              left: 0,
              top: 'var(--header-height, 64px)',
            }}
          >
            <Sidebar collapsed={collapsed} onItemClick={isMobile ? closeMobileMenu : undefined} />
          </Sider>
          <Content
            className="app-content"
            style={{
              marginLeft: collapsed ? 80 : 280,
              padding: '24px 48px',
              height: '100%',
              overflow: 'auto',
              background: 'transparent',
              transition: 'margin-left 0.2s',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
