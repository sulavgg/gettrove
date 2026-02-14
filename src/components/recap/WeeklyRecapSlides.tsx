import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Download, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DayStatus {
  day: string;
  posted: boolean;
}

export interface WeekPhoto {
  id: string;
  photoUrl: string;
  caption?: string | null;
  createdAt: string;
  dayName: string;
  groupName?: string;
}

export interface RecapData {
  id: string;
  weekRange: string;
  weekStart: string;
  weekEnd: string;
  daysPosted: number;
  dayStatuses: DayStatus[];
  weekPhotos: WeekPhoto[];
  currentStreak: number;
  streakChange: number;
  streakBrokenOn?: string;
  longestStreakMonth: number;
  groupRank?: number;
  groupTotal?: number;
  groupConsistency?: number;
  userConsistency?: number;
  bestPerformerName?: string;
  bestPerformerDays?: number;
  strugglingMemberName?: string;
  strugglingMemberDays?: number;
  mostProductiveDay?: string;
  toughestDay?: string;
  avgPostTime?: string;
  earliestPostTime?: string;
  earliestPostDay?: string;
  nextMilestoneDays?: number;
  nextMilestoneName?: string;
}

interface WeeklyRecapSlidesProps {
  data: RecapData;
  onClose: () => void;
  onShare: () => void;
}

export const WeeklyRecapSlides = ({ data, onClose, onShare }: WeeklyRecapSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasPhotos = data.weekPhotos && data.weekPhotos.length > 0;
  const TOTAL_SLIDES = hasPhotos ? 7 : 6;
  
  const isPerfectWeek = data.daysPosted === 7;
  const hasStreakMilestone = data.currentStreak > 0 && data.currentStreak % 7 === 0;

  useEffect(() => {
    if ((isPerfectWeek || hasStreakMilestone) && currentSlide === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [isPerfectWeek, hasStreakMilestone, currentSlide]);

  const nextSlide = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleTouchStart = useRef<number>(0);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = handleTouchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const renderDayCircles = () => (
    <div className="grid grid-cols-7 gap-2 mt-6">
      {data.dayStatuses.map((day, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
              day.posted
                ? "bg-primary/20 border-2 border-primary"
                : "bg-muted/30 border-2 border-muted"
            )}
          >
            {day.posted ? '✅' : '⭕'}
          </div>
          <span className="text-xs text-muted-foreground">{day.day.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );

  const slides = [
    // Slide 1: This Week Overview
    <div key="overview" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-4"
      >
        This Week on TROVE
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground mb-8"
      >
        {data.weekRange}
      </motion.p>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="text-center mb-8"
      >
        <span className="text-7xl font-black text-foreground">{data.daysPosted}</span>
        <span className="text-3xl text-muted-foreground">/7</span>
        <p className="text-xl text-muted-foreground mt-2">days posted</p>
      </motion.div>
      {renderDayCircles()}
    </div>,

    // Slide 2: Photo Collage (only if photos exist)
    ...(hasPhotos ? [
      <div key="photos" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-primary font-bold tracking-wider uppercase mb-4"
        >
          Your Week in Photos
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mb-6"
        >
          {data.weekPhotos.length} {data.weekPhotos.length === 1 ? 'check-in' : 'check-ins'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "w-full max-w-sm",
            data.weekPhotos.length === 1 
              ? "aspect-square" 
              : data.weekPhotos.length === 2 
                ? "grid grid-cols-2 gap-2"
                : data.weekPhotos.length <= 4 
                  ? "grid grid-cols-2 gap-2"
                  : "grid grid-cols-3 gap-2"
          )}
        >
          {data.weekPhotos.slice(0, 9).map((photo, idx) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * idx + 0.3 }}
              className={cn(
                "relative overflow-hidden rounded-xl bg-secondary",
                data.weekPhotos.length === 1 ? "aspect-square w-full" : "aspect-square"
              )}
            >
              <img
                src={photo.photoUrl}
                alt={`Check-in on ${photo.dayName}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium">{photo.dayName}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        {data.weekPhotos.length > 9 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-muted-foreground text-sm mt-4"
          >
            +{data.weekPhotos.length - 9} more
          </motion.p>
        )}
      </div>
    ] : []),

    // Slide 3: Streak Status
    <div key="streak" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-8"
      >
        Your Streak Status
      </motion.p>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center mb-8"
      >
        <span className="text-6xl">🔥</span>
        <p className="text-5xl font-black text-foreground mt-4">{data.currentStreak} days</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 text-center"
      >
        <p className={cn(
          "text-xl font-semibold",
          data.streakChange >= 0 ? "text-success" : "text-destructive"
        )}>
          {data.streakChange >= 0 ? '↗️' : '↘️'} {data.streakChange >= 0 ? '+' : ''}{data.streakChange} days from last week
        </p>
        {data.streakBrokenOn && (
          <p className="text-muted-foreground">Streak broken on {data.streakBrokenOn}</p>
        )}
        <p className="text-lg text-muted-foreground">
          Longest streak this month: <span className="text-foreground font-bold">{data.longestStreakMonth} days</span>
        </p>
      </motion.div>
    </div>,

    // Slide 3: Group Performance
    <div key="group" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-8"
      >
        Group Performance
      </motion.p>
      {data.groupRank && data.groupTotal ? (
        <>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-center mb-8"
          >
            <p className="text-5xl font-black text-foreground">#{data.groupRank}</p>
            <p className="text-xl text-muted-foreground">out of {data.groupTotal}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 w-full max-w-sm"
          >
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-sm mb-1">Group consistency</p>
              <p className="text-lg font-semibold">
                Your group: <span className="text-foreground">{data.groupConsistency}%</span>
                {' '}(you: <span className="text-primary">{data.userConsistency}%</span>)
              </p>
            </div>
            {data.bestPerformerName && (
              <div className="bg-card p-4 rounded-xl border border-border">
                <p className="text-muted-foreground text-sm mb-1">🥇 Best performer</p>
                <p className="text-lg font-semibold">
                  {data.bestPerformerName} - {data.bestPerformerDays}/7 days
                </p>
              </div>
            )}
            {data.strugglingMemberName && (
              <div className="bg-card p-4 rounded-xl border border-border">
                <p className="text-muted-foreground text-sm mb-1">💀 Who struggled</p>
                <p className="text-lg font-semibold">
                  {data.strugglingMemberName} - {data.strugglingMemberDays}/7 days
                </p>
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-center"
        >
          Join a group to see group stats!
        </motion.p>
      )}
    </div>,

    // Slide 4: Posting Habits
    <div key="habits" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-8"
      >
        Your Posting Habits
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 w-full max-w-sm"
      >
        {data.mostProductiveDay && (
          <div className="bg-card p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-sm mb-1">📈 Most productive day</p>
            <p className="text-lg font-semibold text-foreground">{data.mostProductiveDay}</p>
          </div>
        )}
        {data.toughestDay && (
          <div className="bg-card p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-sm mb-1">😓 Toughest day</p>
            <p className="text-lg font-semibold text-foreground">{data.toughestDay}</p>
          </div>
        )}
        {data.avgPostTime && (
          <div className="bg-card p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-sm mb-1">⏰ Average post time</p>
            <p className="text-lg font-semibold text-foreground">{data.avgPostTime}</p>
          </div>
        )}
        {data.earliestPostTime && (
          <div className="bg-card p-4 rounded-xl border border-border">
            <p className="text-muted-foreground text-sm mb-1">🌅 Fastest post</p>
            <p className="text-lg font-semibold text-foreground">
              {data.earliestPostTime} on {data.earliestPostDay}
            </p>
            <p className="text-sm text-muted-foreground">Early bird! 🌅</p>
          </div>
        )}
      </motion.div>
    </div>,

    // Slide 5: Looking Ahead
    <div key="ahead" className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-8"
      >
        Looking Ahead
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6 text-center"
      >
        {data.nextMilestoneDays && data.nextMilestoneDays > 0 && (
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-2xl border border-primary/30">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-xl font-bold text-foreground">
              {data.nextMilestoneDays} more days until {data.nextMilestoneName}!
            </p>
          </div>
        )}
        <div className="bg-card p-6 rounded-xl border border-border">
          <p className="text-2xl mb-3">💪</p>
          <p className="text-lg text-foreground">
            {isPerfectWeek
              ? "Perfect week! Can you do it again?"
              : data.streakBrokenOn
                ? "Fresh start Monday. Let's go!"
                : "Can you hit 7/7 next week?"}
          </p>
        </div>
      </motion.div>
    </div>,

    // Slide 6: Share
    <div key="share" className="flex flex-col items-center min-h-full px-4 py-10 overflow-y-auto">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-primary font-bold tracking-wider uppercase mb-4 text-sm"
      >
        Share Your Week
      </motion.p>
      
      {/* Shareable card — photo-forward design */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-sm bg-gradient-to-br from-card via-card to-background rounded-3xl border border-border overflow-hidden shadow-lg mb-6"
      >
        {/* Photo collage section */}
        {hasPhotos && (
          <div className="relative">
            <div className={cn(
              "w-full",
              data.weekPhotos.length === 1 
                ? "" 
                : data.weekPhotos.length <= 2 
                  ? "grid grid-cols-2" 
                  : data.weekPhotos.length <= 4 
                    ? "grid grid-cols-2" 
                    : "grid grid-cols-3"
            )}>
              {data.weekPhotos.slice(0, 6).map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * idx + 0.2 }}
                  className={cn(
                    "relative overflow-hidden bg-secondary",
                    data.weekPhotos.length === 1 ? "aspect-[4/3]" : "aspect-square"
                  )}
                >
                  <img
                    src={photo.photoUrl}
                    alt={`Check-in on ${photo.dayName}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2">
                    <p className="text-white text-[10px] font-bold uppercase tracking-wide">
                      {photo.dayName}
                    </p>
                    {photo.groupName && (
                      <p className="text-white/70 text-[9px]">{photo.groupName}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            {data.weekPhotos.length > 6 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                +{data.weekPhotos.length - 6}
              </div>
            )}
          </div>
        )}

        {/* Stats section */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground tracking-wide uppercase">My TROVE Week</p>
              <p className="text-xs text-muted-foreground">{data.weekRange}</p>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-black text-foreground">
              {data.daysPosted}<span className="text-xl text-muted-foreground">/7</span>
            </p>
            <p className="text-lg font-bold text-primary">
              {data.currentStreak}-day streak
            </p>
          </div>
          {/* Day dots */}
          <div className="flex gap-1.5">
            {data.dayStatuses.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs",
                  day.posted 
                    ? "bg-primary/20 border-2 border-primary text-primary" 
                    : "bg-muted/30 border border-muted text-muted-foreground"
                )}>
                  {day.posted ? '✓' : '·'}
                </div>
                <span className="text-[9px] text-muted-foreground">{day.day.slice(0, 2)}</span>
              </div>
            ))}
          </div>
          {data.groupRank && data.groupTotal && (
            <p className="text-sm text-muted-foreground">
              Ranked <span className="font-bold text-foreground">#{data.groupRank}</span> of {data.groupTotal} in group
            </p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 w-full max-w-sm"
      >
        <Button
          onClick={onShare}
          className="w-full h-14 gradient-primary font-bold gap-2"
        >
          <Instagram className="w-5 h-5" />
          Share to Instagram Story
        </Button>
        <Button
          variant="outline"
          onClick={onShare}
          className="w-full h-12 gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share Elsewhere
        </Button>
        <Button
          variant="ghost"
          onClick={onShare}
          className="w-full h-12 gap-2"
        >
          <Download className="w-5 h-5" />
          Download Image
        </Button>
      </motion.div>
    </div>,
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background overflow-hidden"
      onTouchStart={(e) => { handleTouchStart.current = e.touches[0].clientX; }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 0.5,
                ease: 'linear',
              }}
              className={cn(
                "absolute w-3 h-3 rounded-sm",
                ['bg-primary', 'bg-warning', 'bg-success', 'bg-destructive'][Math.floor(Math.random() * 4)]
              )}
            />
          ))}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-3 rounded-full bg-card/80 text-foreground safe-area-top"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-40 safe-area-top">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === currentSlide ? "bg-primary w-6" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait" custom={currentSlide}>
        <motion.div
          key={currentSlide}
          custom={currentSlide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full h-full pt-16"
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-card/50 text-foreground"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentSlide < TOTAL_SLIDES - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-card/50 text-foreground"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
