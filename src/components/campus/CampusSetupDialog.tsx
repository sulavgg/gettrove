import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Search } from 'lucide-react';
import { detectUniversityFromEmail, isEduEmail, universityList } from '@/lib/universities';

interface CampusSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onConfirm: (campus: string) => void;
}

type EntryMode = 'university' | 'hometown';

export const CampusSetupDialog = ({ open, onOpenChange, email, onConfirm }: CampusSetupDialogProps) => {
  const detectedUniversity = detectUniversityFromEmail(email);
  const hasEduEmail = isEduEmail(email);
  
  const [step, setStep] = useState<'detect' | 'manual'>(detectedUniversity ? 'detect' : 'manual');
  const [mode, setMode] = useState<EntryMode>(hasEduEmail ? 'university' : 'hometown');
  const [selectedUniversity, setSelectedUniversity] = useState<string>(detectedUniversity || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [hometown, setHometown] = useState('');

  useEffect(() => {
    if (detectedUniversity) {
      setStep('detect');
      setSelectedUniversity(detectedUniversity);
    } else {
      setStep('manual');
    }
  }, [detectedUniversity]);

  const filteredUniversities = universityList.filter(u => 
    u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    const value = step === 'detect'
      ? selectedUniversity
      : mode === 'university'
        ? selectedUniversity
        : hometown;
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  const canConfirm = step === 'detect'
    ? !!selectedUniversity
    : mode === 'university'
      ? !!selectedUniversity
      : !!hometown.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">📍 Set Your Community</DialogTitle>
        </DialogHeader>

        {step === 'detect' && detectedUniversity ? (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                We detected you're at:
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
                <p className="text-lg font-bold text-foreground">{detectedUniversity}</p>
              </div>
              <p className="text-sm text-muted-foreground">Is this correct?</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-primary text-primary-foreground font-semibold gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={1.5} />
                Yes, that's right
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('manual');
                  setSelectedUniversity('');
                }}
                className="flex-1"
              >
                No, change it
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => { setMode('university'); setHometown(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === 'university'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                🎓 University
              </button>
              <button
                onClick={() => { setMode('hometown'); setSelectedUniversity(''); setSearchQuery(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === 'hometown'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                🏠 Hometown
              </button>
            </div>

            {mode === 'university' ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Search and select your university
                </p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    placeholder="Search universities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                  {filteredUniversities.map(uni => (
                    <button
                      key={uni}
                      onClick={() => setSelectedUniversity(uni)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedUniversity === uni
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {uni}
                    </button>
                  ))}
                  {filteredUniversities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No results</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Type your hometown or city
                </p>
                <Input
                  placeholder="e.g. Austin, TX"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  autoFocus
                />
              </>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              Confirm
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
