import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Search } from 'lucide-react';
import { detectUniversityFromEmail, isEduEmail, universityList } from '@/lib/universities';

interface CampusSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onConfirm: (campus: string) => void;
}

export const CampusSetupDialog = ({ open, onOpenChange, email, onConfirm }: CampusSetupDialogProps) => {
  const detectedUniversity = detectUniversityFromEmail(email);
  const hasEduEmail = isEduEmail(email);
  
  const [step, setStep] = useState<'detect' | 'manual'>(detectedUniversity ? 'detect' : 'manual');
  const [selectedUniversity, setSelectedUniversity] = useState<string>(detectedUniversity || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');

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
    const campus = step === 'detect' ? selectedUniversity : (selectedUniversity || customUniversity);
    if (campus.trim()) {
      onConfirm(campus.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">🏫 Set Your Campus</DialogTitle>
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
            <p className="text-sm text-muted-foreground text-center">
              {hasEduEmail 
                ? "We couldn't auto-detect your school. Please select it below."
                : "Which school do you attend?"}
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="Search universities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* University list */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
              {filteredUniversities.map(uni => (
                <button
                  key={uni}
                  onClick={() => {
                    setSelectedUniversity(uni);
                    setCustomUniversity('');
                  }}
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

            {/* Manual entry */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Or enter manually:</p>
              <Input
                placeholder="Your university name"
                value={customUniversity}
                onChange={(e) => {
                  setCustomUniversity(e.target.value);
                  setSelectedUniversity('');
                }}
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!selectedUniversity && !customUniversity.trim()}
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
