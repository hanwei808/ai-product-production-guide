'use client'

import { Layout, Typography, Space } from 'antd'
import { GithubOutlined, BookOutlined } from '@ant-design/icons'
import Link from 'next/link'

const { Header: AntHeader } = Layout
const { Title } = Typography

export function Header() {
  return (
    <AntHeader
      style={{
        background: '#001529',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        top: 0,
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BookOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <Title level={4} style={{ margin: 0, color: '#fff' }}>
          AI 产品生产指南
        </Title>
      </Link>
      
      <Space size="large">
        <a
          href="https://github.com/hanwei808/ai-product-production-guide"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#fff', fontSize: 20 }}
        >
          <GithubOutlined />
        </a>
      </Space>
    </AntHeader>
  )
}
