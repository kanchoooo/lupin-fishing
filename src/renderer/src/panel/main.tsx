import { createRoot } from 'react-dom/client'
import '@/common/base.css'
import './panel.css'
import { Panel } from './Panel'

createRoot(document.getElementById('root')!).render(<Panel />)
