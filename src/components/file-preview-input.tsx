
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import Image from 'next/image';
import { Trash2 } from "lucide-react";

interface FilePreviewInputProps {
  file: File;
  onRemove: () => void;
}

export function FilePreviewInput({ file, onRemove }: FilePreviewInputProps) {
  const isImage = file.type.startsWith('image/');
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);
  
  if (!fileUrl) return null;

  return (
    <Card className="relative mb-2 flex animate-in fade-in-50 items-center gap-3 p-2">
      <div className="flex-shrink-0">
        {isImage ? (
          <Image
            src={fileUrl}
            alt={file.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
            <FileText className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(2)} KB
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
}
