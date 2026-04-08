import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store/StoreContext'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import Session from './pages/Session'
import History from './pages/History'
import Coach from './pages/Coach'
import Settings from './pages/Settings'

export function App() {
  return (
    <StoreProvider>
      <Router>
        <div className="dark min-h-screen bg-brutal-900 text-white">
          <div className="mx-auto max-w-[430px] min-h-screen relative bg-brutal-900">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session" element={<Session />} />
              <Route path="/history" element={<History />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
            <BottomNav />
          </div>
        </div>
      </Router>
    </StoreProvider>
  )
}
