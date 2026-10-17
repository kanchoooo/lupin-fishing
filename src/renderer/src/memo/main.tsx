import { createRoot } from 'react-dom/client'
import './memo.css'
import { MemoNote } from './MemoNote'

createRoot(document.getElementById('root')!).render(<MemoNote id={location.hash.slice(1)} />)
