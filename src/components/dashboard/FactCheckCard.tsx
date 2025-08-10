import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProcessedPost } from '@/types/Post';
import { useToast } from '@/hooks/use-toast';

interface FactCheckCardProps {
  post?: ProcessedPost | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function FactCheckCard({ post, open, onOpenChange }: FactCheckCardProps) {
  const { toast } = useToast();
  const share = () => toast({ title: 'Shared', description: 'Fact-check sent to public channels.' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fact Check: Dengue Transmission</DialogTitle>
          <DialogDescription>
            AI-generated summary to counter misinformation and inform the public.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-medium">Rumor</p>
          <p className="text-sm text-muted-foreground border rounded-md p-3">{post?.text}</p>
          <p className="text-sm font-medium">Truth</p>
          <p className="text-sm leading-relaxed">{post?.factCheck ?? 'This claim is inaccurate. Dengue is transmitted by Aedes mosquitoes. Remove stagnant water, use repellents, and follow MOH guidance.'}</p>
          <div className="pt-2">
            <Button variant="hero" onClick={share}>Share to Public Channels</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
