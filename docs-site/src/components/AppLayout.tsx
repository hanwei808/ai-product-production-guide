'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ConfigProvider, Layout, theme as antTheme } from 'antd'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { TableOfContents } from '@/components/TableOfContents'
import { useTheme } from '@/lib/ThemeContext'

const { Content, Sider } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // 切换页面时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

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
      <Layout style={{ minHeight: '100vh', overflow: 'visible' }}>
        <Header 
          onMenuClick={toggleMobileMenu} 
          mobileMenuOpen={mobileMenuOpen}
        />
        <Layout style={{ marginTop: 0, minHeight: '100vh', paddingTop: 'var(--header-height, 64px)' }}>
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
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(245, 245, 250, 0.5) 100%)' 
                : 'linear-gradient(180deg, rgba(45, 45, 50, 0.6) 0%, rgba(30, 30, 35, 0.5) 100%)',
              backdropFilter: 'saturate(200%) blur(40px)',
              WebkitBackdropFilter: 'saturate(200%) blur(40px)',
              borderRight: theme === 'light'
                ? '1px solid rgba(255, 255, 255, 0.6)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: theme === 'light'
                ? '4px 0 30px rgba(0, 0, 0, 0.03), inset -1px 0 1px rgba(255, 255, 255, 0.8)'
                : '4px 0 30px rgba(0, 0, 0, 0.15), inset -1px 0 1px rgba(255, 255, 255, 0.08)',
              overflow: 'auto',
              height: '100vh',
              position: 'fixed',
              left: 0,
              top: 0,
              paddingTop: 'var(--header-height, 64px)',
            }}
          >
            <Sidebar collapsed={collapsed} onItemClick={isMobile ? closeMobileMenu : undefined} />
          </Sider>
          <Content
            className="app-content"
            style={{
              marginLeft: collapsed ? 80 : 280,
              marginRight: 240,
              padding: '24px 48px',
              paddingTop: 'calc(var(--header-height, 64px) + 24px)',
              marginTop: 'calc(-1 * var(--header-height, 64px) + 58px)',
              minHeight: '100vh',
              overflow: 'visible',
              background: 'transparent',
              transition: 'margin-left 0.2s, margin-right 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {children}
          </Content>
          <aside 
            className="toc-aside"
            style={{
              width: 220,
              position: 'fixed',
              right: 20,
              top: 'calc(var(--header-height, 64px) + 24px)',
              maxHeight: 'calc(100vh - var(--header-height, 64px) - 48px)',
              overflow: 'auto',
            }}
          >
            <TableOfContents />
          </aside>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
