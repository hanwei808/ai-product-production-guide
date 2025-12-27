import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { AppLayout } from '@/components/AppLayout'
import { ThemeProvider } from '@/lib/ThemeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 产品生产指南',
  description: '企业级 AI 产品开发、部署与运维的技术栈选型与最佳实践指南',
  icons: {
    icon: '/favicon.svg',
  },
}

// 防止主题闪烁的内联脚本
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme-mode');
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
  })()
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AntdRegistry>
          <ThemeProvider>
            <AppLayout>{children}</AppLayout>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
