import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
}

export const OnboardingWelcome = ({ onNext }: Props) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-8"
      >
        <h1 className="text-5xl font-heading font-black tracking-tight text-center">
          <span className="text-foreground">TROVE</span>
        </h1>
        <p className="text-muted-foreground/60 text-sm italic text-center mt-2">
          Consistency is Currency
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-center max-w-xs mb-10"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-3">
          Start Building Your Trove
        </h2>
        <p className="text-muted-foreground text-base">
          Document your habits, earn points, compete with friends. Your consistency journey starts now.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Button
          onClick={onNext}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Let's Go
        </Button>
      </motion.div>
    </div>
  );
};
