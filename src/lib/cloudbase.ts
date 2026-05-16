/// <reference types="vite/client" />
import cloudbase from "@cloudbase/js-sdk";

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || "";

// Use a flag to track if we have a valid environment
export const isCloudBaseConfigured = !!envId && envId !== "placeholder-env-id" && envId.length > 5;

if (!isCloudBaseConfigured) {
  console.warn("VITE_CLOUDBASE_ENV_ID is missing or invalid. CloudBase features will be disabled or fall back to local mode.");
}

// Fixed constant to avoid regional mismatch issues if default isn't right
export const app = cloudbase.init({
  env: envId || "placeholder-env-id",
  timeout: 60000, // Increase timeout to 60s for better stability
});

// Suppress excessive internal SDK logs and known non-fatal crashes
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalError = console.error;

  const shouldSuppress = (args: any[]) => {
    try {
      const logContent = args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' ');

      return (
        logContent.toLowerCase().includes('[realtime]') || 
        logContent.toLowerCase().includes('[cloudbase]') ||
        logContent.toLowerCase().includes('[@cloudbase/js-sdk]') ||
        logContent.toLowerCase().includes('initwatch success') ||
        logContent.toLowerCase().includes('ws event:') ||
        logContent.toLowerCase().includes('nextevent') ||
        logContent.toLowerCase().includes('timedout') ||
        logContent.toLowerCase().includes('timeout') ||
        logContent.toLowerCase().includes('pong timed out') ||
        logContent.toLowerCase().includes('wsclient.send') ||
        logContent.toLowerCase().includes('manual refresh failed') ||
        logContent.toLowerCase().includes('reading \'scope\'') ||
        logContent.toLowerCase().includes('initwebsocketconnection') ||
        logContent.toLowerCase().includes('websocket') ||
        logContent.toLowerCase().includes('rebuilding') ||
        logContent.toLowerCase().includes('websocket closed without opened')
      );
    } catch (e) {
      return false;
    }
  };

  console.log = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalLog.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalWarn.apply(console, args);
  };
  console.info = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalInfo.apply(console, args);
  };
  // Also suppress the specific error message if it's coming through console.error but is expected
  console.error = (...args: any[]) => {
     if (shouldSuppress(args)) return;
     originalError.apply(console, args);
  };

  // Catch all variations of runtime errors and unhandled rejections
  window.addEventListener('error', (event) => {
    const errorMsg = String(event.message || event.error).toLowerCase();
    if (
      errorMsg.includes('wsclient.send') || 
      errorMsg.includes('timedout') || 
      errorMsg.includes('timeout') ||
      errorMsg.includes('websocket')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason).toLowerCase();
    if (
      reason.includes('wsclient.send') ||
      reason.includes('timedout') ||
      reason.includes('timeout') ||
      reason.includes('websocket') ||
      reason.includes('scope') ||
      reason.includes('cloudbase') ||
      reason.includes('rebuilding')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

export const auth = app.auth({ persistence: "local" });
export const db = app.database();

// CloudBase file upload helper
export const uploadFile = async (file: File | Blob, path: string, _onProgress?: (percent: number) => void): Promise<string> => {
  if (!isCloudBaseConfigured) {
    throw new Error("CloudBase is not configured. Upload disabled.");
  }
  try {
    const res = await app.uploadFile({
      cloudPath: path,
      filePath: file as any // Cast to any to bypass strict string check
    });
    return res.fileID; // Return the permanent fileID instead of temp URL
  } catch (err: any) {
    console.error("CloudBase Upload error:", err);
    throw new Error(err.message || "上传失败");
  }
};

// CloudBase file URL helper with caching, deduplication, and batching
const urlCache = new Map<string, { url: string, expiry: number }>();
const pendingPromises = new Map<string, Promise<string>>();
let batchQueue: { fileId: string, resolve: (url: string) => void, reject: (err: any) => void }[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours (CloudBase temp URLs typically last 2h)

const processBatch = async () => {
  if (batchQueue.length === 0) return;
  
  const currentBatch = [...batchQueue];
  batchQueue = [];
  batchTimeout = null;

  // Group queue items by fileId
  const fileIdToItems = new Map<string, typeof currentBatch>();
  currentBatch.forEach(item => {
    const items = fileIdToItems.get(item.fileId) || [];
    items.push(item);
    fileIdToItems.set(item.fileId, items);
  });

  const uniqueFileIds = Array.from(fileIdToItems.keys());
  const BATCH_SIZE_LIMIT = 50; // CloudBase limit
  
  // Process in chunks of 50
  for (let i = 0; i < uniqueFileIds.length; i += BATCH_SIZE_LIMIT) {
    const chunkIds = uniqueFileIds.slice(i, i + BATCH_SIZE_LIMIT);
    
    try {
      const { fileList } = await app.getTempFileURL({ fileList: chunkIds });
      
      fileList.forEach((item: any) => {
        const status = item.code || 'SUCCESS';
        if (status === 'SUCCESS' && item.tempFileURL) {
          urlCache.set(item.fileID, {
            url: item.tempFileURL,
            expiry: Date.now() + CACHE_EXPIRY
          });
          
          const items = fileIdToItems.get(item.fileID);
          items?.forEach(bi => bi.resolve(item.tempFileURL));
        } else {
          // If a specific file failed, fallback to original ID
          const items = fileIdToItems.get(item.fileID);
          items?.forEach(bi => bi.resolve(item.fileID));
        }
      });
    } catch (err: any) {
      console.error("Batch resolve failed for chunk:", err);
      // If the whole chunk failed (e.g. rate limit), reject those specific items
      chunkIds.forEach(fid => {
        const items = fileIdToItems.get(fid);
        items?.forEach(bi => bi.reject(err));
      });
    }
  }
};

export const getFileUrl = async (fileId: string): Promise<string> => {
  if (!fileId || !fileId.startsWith('cloud://') || !isCloudBaseConfigured) return fileId;

  // 1. Check cache
  const cached = urlCache.get(fileId);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }

  // 2. Check for pending identical request
  if (pendingPromises.has(fileId)) {
    return pendingPromises.get(fileId)!;
  }

  // 3. Add to batch queue
  const promise = new Promise<string>((resolve, reject) => {
    batchQueue.push({ fileId, resolve, reject });
    
    if (!batchTimeout) {
      batchTimeout = setTimeout(processBatch, 50); // Small window to batch requests
    }
  });

  pendingPromises.set(fileId, promise);
  
  try {
    const url = await promise;
    return url;
  } finally {
    pendingPromises.delete(fileId);
  }
};
