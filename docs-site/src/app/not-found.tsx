export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '50vh',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 72, margin: 0, color: '#1677ff' }}>404</h1>
      <h2 style={{ marginTop: 16 }}>页面未找到</h2>
      <p style={{ color: '#666', marginTop: 8 }}>
        您访问的文档不存在或已被移动。
      </p>
      <a 
        href="/" 
        style={{ 
          marginTop: 24, 
          padding: '8px 24px', 
          background: '#1677ff', 
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
        }}
      >
        返回首页
      </a>
    </div>
  )
}
