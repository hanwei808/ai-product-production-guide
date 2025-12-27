'use client'

import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, theme } from 'antd'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

const { Content, Sider } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
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
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
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
              background: '#fff',
              borderRight: '1px solid var(--color-border)',
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
              background: '#fff',
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
