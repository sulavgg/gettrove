import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { POINTS, STREAK_MULTIPLIERS } from '@/lib/points';

const SECTIONS = [
  {
    icon: '📝',
    title: 'Post Daily',
    desc: `Every check-in earns you ${POINTS.POST_BASE} base points.`,
  },
  {
    icon: '⏰',
    title: 'Time Bonuses',
    desc: 'Post at special times to earn extra points.',
    items: [
      { label: '🌅 Early Bird (4–7 AM)', pts: POINTS.EARLY_MORNING },
      { label: '🌙 Night Owl (9 PM–12 AM)', pts: POINTS.LATE_NIGHT },
      { label: '🦉 Midnight Grind (12–4 AM)', pts: POINTS.MIDNIGHT },
      { label: '📅 Weekend Warrior', pts: POINTS.WEEKEND },
    ],
  },
  {
    icon: '🔥',
    title: 'Streak Power',
    desc: 'Longer streaks unlock multipliers on every post.',
    items: STREAK_MULTIPLIERS.slice()
      .reverse()
      .map((s) => ({
        label: `${s.min}+ day streak`,
        pts: `×${s.mult}`,
      })),
  },
  {
    icon: '🏆',
    title: 'Milestones',
    desc: 'Hit streak milestones for massive bonus drops.',
    items: [
      { label: '7 days', pts: POINTS.STREAK_MILESTONES[7] },
      { label: '30 days', pts: POINTS.STREAK_MILESTONES[30] },
      { label: '100 days', pts: POINTS.STREAK_MILESTONES[100] },
      { label: '365 days', pts: POINTS.STREAK_MILESTONES[365] },
    ],
  },
  {
    icon: '💬',
    title: 'Engagement',
    desc: 'React and reply to earn even more.',
    items: [
      { label: 'Give a reaction', pts: POINTS.REACTION_GIVEN },
      { label: 'Send a voice reply', pts: POINTS.VOICE_REPLY_GIVEN },
    ],
  },
];

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingPoints = ({ onNext, onSkip }: Props) => {
  return (
    <div className="flex-1 flex flex-col px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col max-w-sm mx-auto w-full"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-1">
          How You Earn Points
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Every action compounds. Here's how the Trove point system works.
        </p>

        <div className="flex-1 overflow-y-auto space-y-5 pb-4 -mx-1 px-1 scrollbar-thin">
          {SECTIONS.map((section, si) => (
            <motion.div
              key={si}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{section.icon}</span>
                <h3 className="font-bold text-foreground text-sm">{section.title}</h3>
              </div>
              <p className="text-muted-foreground text-xs mb-2">{section.desc}</p>

              {section.items && (
                <div className="space-y-1">
                  {section.items.map((item, ii) => (
                    <div
                      key={ii}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-primary tabular-nums">
                        {typeof item.pts === 'number' ? `+${item.pts} pts` : item.pts}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="max-w-sm mx-auto w-full space-y-3 pt-4">
        <Button
          onClick={onNext}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Got It
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );
};
