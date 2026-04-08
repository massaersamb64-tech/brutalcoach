import { useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Timer, BarChart2, MessageCircle, Settings } from 'lucide-react'

const TABS = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/session', icon: Timer, label: 'Session' },
  { path: '/history', icon: BarChart2, label: 'Stats' },
  { path: '/coach', icon: MessageCircle, label: 'Coach' },
  { path: '/settings', icon: Settings, label: 'Config' },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-brutal-900/95 backdrop-blur-sm border-t border-brutal-700
                    safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200
                ${active
                  ? 'text-white'
                  : 'text-brutal-300 hover:text-brutal-100'
                }`}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-200 ${active ? 'bg-brutal-700' : ''}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-white' : 'text-brutal-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
