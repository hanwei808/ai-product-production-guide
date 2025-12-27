import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { AppLayout } from '@/components/AppLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 产品生产指南',
  description: '企业级 AI 产品开发、部署与运维的技术栈选型与最佳实践指南',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <AppLayout>{children}</AppLayout>
        </AntdRegistry>
      </body>
    </html>
  )
}
