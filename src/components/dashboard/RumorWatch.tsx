import { ProcessedPost } from '@/types/Post';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RumorWatchProps {
  misinfo: ProcessedPost[];
  onSelect: (p: ProcessedPost) => void;
}

export default function RumorWatch({ misinfo, onSelect }: RumorWatchProps) {
  return (
    <Card className="h-[380px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Rumor Watch</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-3 pr-1">
        {misinfo.length === 0 && (
          <p className="text-sm text-muted-foreground">No misinformation detected yet.</p>
        )}
        {misinfo.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="w-full text-left rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <p className="text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.user ?? '@user'}</p>
            <p className="text-sm mt-1">{m.text}</p>
            {m.factCheck && (
              <p className="text-xs mt-1 text-muted-foreground">Fact-check ready ↗</p>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
