
'use client';

import { getFile } from '@/lib/indexed-db';
import { cn } from '@/lib/utils';
import { FileText, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AttachmentPreviewProps {
  fileId: string;
  fileName: string;
  fileType: string;
  context: 'message' | 'input';
}

export function AttachmentPreview({
  fileId,
  fileName,
  fileType,
  context,
}: AttachmentPreviewProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadFile = async () => {
      setIsLoading(true);
      try {
        const url = await getFile(fileId);
        if (isMounted) {
            setFileUrl(url);
        }
      } catch (error) {
          console.error("Failed to load file from IndexedDB:", error);
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md p-2',
          context === 'message' ? 'bg-black/10' : 'border'
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading attachment...</span>
      </div>
    );
  }

  if (!fileUrl) return <div className="text-xs text-destructive">Could not load attachment.</div>;

  if (fileType.startsWith('image/')) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={fileUrl}
          alt={fileName}
          width={context === 'input' ? 80 : 200}
          height={context === 'input' ? 80 : 200}
          className="max-h-48 w-auto rounded-lg object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={cn(
        'flex items-center gap-3 rounded-lg p-3',
        context === 'message' ? 'bg-black/10' : 'border'
      )}
       onClick={(e) => e.stopPropagation()}
    >
      <FileText className="h-8 w-8 flex-shrink-0" />
      <div className="overflow-hidden">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">Click to download</p>
      </div>
    </a>
  );
}
