import { ThemeProvider } from '@/contexts/theme';
import { warmup } from '@/apis/request';
import './app.scss';

export default function ({ children }) {
  // 启动时预热：对所有数据源发一次最小请求，
  // 1) 建立 TCP+TLS 连接，后续请求复用，省去约 400ms 握手开销
  // 2) 收集各源响应时间，用于智能源选择排序
  // 3) 顺便填充首页第一页缓存
  // 不阻塞渲染，失败也不影响功能
  warmup();

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
