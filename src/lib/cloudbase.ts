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

export const getFileUrl = async (fileId: string): Promise<string> => {
  if (!fileId || !fileId.startsWith('cloud://') || !isCloudBaseConfigured) return fileId;
  try {
    const { fileList } = await app.getTempFileURL({
      fileList: [fileId]
    });
    if (!fileList || !fileList[0]) return fileId;
    return fileList[0].tempFileURL;
  } catch (err) {
    console.error("Get temp URL failed:", err);
    return fileId;
  }
};
