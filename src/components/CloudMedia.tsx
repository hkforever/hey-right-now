import React, { useState, useEffect } from 'react';
import { getFileUrl, isCloudBaseConfigured } from '../lib/cloudbase';
import { Loader2, Image as ImageIcon, PlayCircle } from 'lucide-react';

interface CloudMediaProps {
  src: string | undefined;
  type?: 'image' | 'video';
  fallback?: React.ReactNode;
  className?: string;
  [key: string]: any; // Allow other attributes like controls, muted, etc.
}

export default function CloudMedia({ src, type = 'image', fallback, className, ...props }: CloudMediaProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolve() {
      if (!src) {
        setLoading(false);
        return;
      }

      // Check if it's already a blob or data URL
      if (src.startsWith('blob:') || src.startsWith('data:')) {
        if (isMounted) {
          setResolvedUrl(src);
          setLoading(false);
        }
        return;
      }

      if (src.startsWith('cloud://') && isCloudBaseConfigured) {
        setLoading(true);
        try {
          const url = await getFileUrl(src);
          if (isMounted) setResolvedUrl(url);
        } catch (err) {
          console.error('[CloudMedia] Failed to resolve:', src, err);
          if (isMounted) setError(true);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        if (isMounted) {
          setResolvedUrl(src);
          setLoading(false);
        }
      }
    }

    resolve();
    return () => { isMounted = false; };
  }, [src]);

  if (!src && fallback) return <>{fallback}</>;
  if (!src) return <div className={`${className} bg-gray-100 flex items-center justify-center`}><ImageIcon className="w-1/2 h-1/2 text-gray-300" /></div>;

  if (loading) {
    return (
      <div className={`${className} bg-gray-50 flex items-center justify-center`}>
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}>
        {type === 'video' ? <PlayCircle className="w-1/2 h-1/2" /> : <ImageIcon className="w-1/2 h-1/2" />}
      </div>
    );
  }

  if (type === 'video') {
    return (
      <video 
        src={resolvedUrl} 
        className={className} 
        {...props} 
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img 
      src={resolvedUrl} 
      className={className} 
      {...props} 
      onError={() => setError(true)}
    />
  );
}
