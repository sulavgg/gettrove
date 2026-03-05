import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BarChart3, Trophy, MessageSquarePlus, User, LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Groups', path: '/groups' },
  { icon: Trophy, label: 'Compete', path: '/leaderboard' },
  { icon: MessageSquarePlus, label: 'Feedback', path: '/feedback' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const TubelightNavbar = () => {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [tabOffsets, setTabOffsets] = useState<number[]>([]);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine active index from route
  useEffect(() => {
    const idx = navItems.findIndex((item) => {
      if (item.path === '/groups') {
        return location.pathname === '/groups' || location.pathname.startsWith('/group');
      }
      return location.pathname === item.path;
    });
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [location.pathname]);

  // Measure tab positions
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const widths: number[] = [];
      const offsets: number[] = [];
      tabRefs.current.forEach((ref) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          widths.push(rect.width);
          offsets.push(rect.left - containerRect.left);
        }
      });
      setTabWidths(widths);
      setTabOffsets(offsets);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const indicatorWidth = tabWidths[activeIndex] || 0;
  const indicatorOffset = tabOffsets[activeIndex] || 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="relative bg-card/95 backdrop-blur-xl border-t border-border">
        {/* Tubelight glow indicator */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" ref={containerRef}>
          {indicatorWidth > 0 && (
            <motion.div
              className="absolute top-0 h-full"
              initial={false}
              animate={{
                x: indicatorOffset,
                width: indicatorWidth,
              }}
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 30,
              }}
            >
              {/* Core glow line */}
              <div className="absolute inset-0 bg-gold rounded-full" />
              {/* Outer glow */}
              <div className="absolute -inset-x-2 -top-1 bottom-0 h-3 bg-gold/30 blur-md rounded-full" />
              {/* Wide ambient glow */}
              <div className="absolute -inset-x-4 -top-2 bottom-0 h-5 bg-gold/15 blur-xl rounded-full" />
            </motion.div>
          )}
        </div>

        {/* Nav items */}
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={item.path}
                to={item.path}
                ref={(el) => { tabRefs.current[index] = el; }}
                className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 transition-colors duration-200"
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-gold' : 'text-muted-foreground'
                    }`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                </motion.div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-200 ${
                    isActive ? 'text-gold' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
