import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointTransaction {
  point_type: string;
  points: number;
  description: string | null;
}

interface PointsBadgeProps {
  transactions: PointTransaction[];
  className?: string;
}

export const PointsBadge = ({ transactions, className }: PointsBadgeProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!transactions || transactions.length === 0) return null;

  const total = transactions.reduce((s, t) => s + t.points, 0);
  const base = transactions.find(t => t.point_type === 'post_base');
  const bonuses = transactions.filter(t => t.point_type !== 'post_base');

  return (
    <div className={cn('', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <span>⚡ +{total} pts</span>
        {bonuses.length > 0 && (
          expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {expanded && bonuses.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-1.5"
          >
            <div className="bg-muted/50 rounded-lg p-2 space-y-0.5 text-xs">
              {base && (
                <div className="flex justify-between text-muted-foreground">
                  <span>📝 Base</span>
                  <span>{base.points} pts</span>
                </div>
              )}
              {bonuses.map((b, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>{b.description || b.point_type}</span>
                  <span className="text-primary">+{b.points} pts</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/50">
                <span>Total</span>
                <span className="text-primary">+{total} pts</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
