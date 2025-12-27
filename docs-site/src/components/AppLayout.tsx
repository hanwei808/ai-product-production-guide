'use client'

import { ConfigProvider, Layout, theme } from 'antd'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

const { Content, Sider } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header />
        <Layout>
          <Sider
            width={280}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
            }}
          >
            <Sidebar />
          </Sider>
          <Content
            style={{
              marginLeft: 280,
              padding: '24px 48px',
              minHeight: 'calc(100vh - 64px)',
              background: '#fff',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
