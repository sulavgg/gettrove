import { useState } from 'react';
import { MessageSquare, Lightbulb, Send, Loader2, CheckCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNav } from '@/components/ui/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Feedback = () => {
  const { user, profile } = useAuth();

  // Issue form
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSteps, setIssueSteps] = useState('');
  const [issueFile, setIssueFile] = useState<File | null>(null);
  const [issueSending, setIssueSending] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);

  // Feature form
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDesc, setFeatureDesc] = useState('');
  const [featureSending, setFeatureSending] = useState(false);
  const [featureSuccess, setFeatureSuccess] = useState(false);

  const submitFeedback = async (type: 'issue' | 'feature', subject: string, body: string) => {
    const { error } = await supabase.from('feedback' as any).insert({
      user_id: user?.id,
      user_name: profile?.name || 'Unknown',
      user_email: profile?.email || user?.email || 'Unknown',
      type,
      subject,
      body,
    });
    if (error) throw error;
  };

  const handleIssueSubmit = async () => {
    if (!issueDesc.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setIssueSending(true);
    try {
      let body = `Issue: ${issueDesc}`;
      if (issueSteps.trim()) body += `\n\nSteps to reproduce:\n${issueSteps}`;
      if (issueFile) body += `\n\n[Screenshot attached: ${issueFile.name}]`;

      await submitFeedback('issue', issueDesc.slice(0, 80), body);

      setIssueSuccess(true);
      setIssueDesc('');
      setIssueSteps('');
      setIssueFile(null);
      setTimeout(() => setIssueSuccess(false), 3000);
    } catch {
      toast.error('Failed to send report. Please try again.');
    } finally {
      setIssueSending(false);
    }
  };

  const handleFeatureSubmit = async () => {
    if (!featureTitle.trim()) {
      toast.error('Please enter a feature title');
      return;
    }
    setFeatureSending(true);
    try {
      let body = `Feature: ${featureTitle}`;
      if (featureDesc.trim()) body += `\n\nWhy it would be useful:\n${featureDesc}`;

      await submitFeedback('feature', featureTitle.slice(0, 80), body);

      setFeatureSuccess(true);
      setFeatureTitle('');
      setFeatureDesc('');
      setTimeout(() => setFeatureSuccess(false), 3000);
    } catch {
      toast.error('Failed to send suggestion. Please try again.');
    } finally {
      setFeatureSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground font-heading mb-1">Feedback</h1>
        <p className="text-sm text-muted-foreground mb-6">Help us improve Trove</p>

        <Tabs defaultValue="issue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="issue" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Report Issue
            </TabsTrigger>
            <TabsTrigger value="feature" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggest Feature
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issue">
            {issueSuccess ? (
              <Card className="border-success/30">
                <CardContent className="flex flex-col items-center gap-3 py-10">
                  <CheckCircle className="w-12 h-12 text-success" />
                  <p className="text-foreground font-medium text-center">Thanks! We'll look into it.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Report an Issue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Short description *</label>
                    <Input
                      placeholder="e.g. Streak counter not updating"
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Steps to reproduce</label>
                    <Textarea
                      placeholder="1. Go to profile&#10;2. Tap on streak&#10;3. Notice it shows 0"
                      value={issueSteps}
                      onChange={(e) => setIssueSteps(e.target.value)}
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Screenshot (optional)</label>
                    {issueFile ? (
                      <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
                        <span className="text-sm text-foreground truncate flex-1">{issueFile.name}</span>
                        <button onClick={() => setIssueFile(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-3 rounded-md border border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tap to attach</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setIssueFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                  <Button
                    onClick={handleIssueSubmit}
                    disabled={issueSending || !issueDesc.trim()}
                    className="w-full"
                  >
                    {issueSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="feature">
            {featureSuccess ? (
              <Card className="border-success/30">
                <CardContent className="flex flex-col items-center gap-3 py-10">
                  <CheckCircle className="w-12 h-12 text-success" />
                  <p className="text-foreground font-medium text-center">Thanks! We'll look into it.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Suggest a Feature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Feature title *</label>
                    <Input
                      placeholder="e.g. Dark mode calendar view"
                      value={featureTitle}
                      onChange={(e) => setFeatureTitle(e.target.value)}
                      maxLength={150}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Why it would be useful</label>
                    <Textarea
                      placeholder="Describe how this feature would help you..."
                      value={featureDesc}
                      onChange={(e) => setFeatureDesc(e.target.value)}
                      rows={5}
                      maxLength={1000}
                    />
                  </div>
                  <Button
                    onClick={handleFeatureSubmit}
                    disabled={featureSending || !featureTitle.trim()}
                    className="w-full"
                  >
                    {featureSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Suggestion
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Feedback;
