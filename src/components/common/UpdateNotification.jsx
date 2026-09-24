import React, { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState(null); // null | 'available' | 'downloading' | 'downloaded' | 'error'
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onUpdateStatus) {
      return;
    }

    const unsubStatus = window.electronAPI.onUpdateStatus((data) => {
      console.log('[UpdateNotification] Status update received:', data);
      if (!data) return;

      if (data.status === 'available') {
        setUpdateStatus('available');
        setUpdateInfo(data);
        setIsDismissed(false);
      } else if (data.status === 'downloading') {
        setUpdateStatus('downloading');
        setIsDismissed(false);
      } else if (data.status === 'downloaded') {
        setUpdateStatus('downloaded');
        setUpdateInfo(data);
        setIsDismissed(false);
      } else if (data.status === 'error') {
        // Only surface error if user was interacting with update or downloading
        if (updateStatus === 'downloading' || updateStatus === 'available') {
          setUpdateStatus('error');
          setErrorMessage(data.error || 'Update failed to download');
        }
      }
    });

    const unsubProgress = window.electronAPI.onUpdateProgress?.((data) => {
      if (data && typeof data.percent === 'number') {
        setDownloadProgress(Math.round(data.percent));
        setUpdateStatus('downloading');
      }
    });

    return () => {
      // Cleanup if listener returns an unsubscribe function
      if (typeof unsubStatus === 'function') unsubStatus();
      if (typeof unsubProgress === 'function') unsubProgress();
    };
  }, [updateStatus]);

  if (isDismissed || !updateStatus) return null;

  const handleDownload = () => {
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    window.electronAPI?.startUpdateDownload?.();
  };

  const handleRestart = () => {
    window.electronAPI?.restartAndInstallUpdate?.();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-indigo-200 dark:border-indigo-700/60 shadow-2xl rounded-2xl p-5 text-gray-900 dark:text-gray-100 transition-all duration-300 animate-slide-up"
    >
      {/* ── Status: AVAILABLE ── */}
      {updateStatus === 'available' && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                🚀
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Update Available
                </h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Version {updateInfo?.version || 'New'} is ready
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition"
              aria-label="Dismiss update notification"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            A new version of Study Time Tracker is available. Includes the latest focus mode enhancements and performance fixes.
          </p>

          {updateInfo?.releaseNotes && (
            <div className="text-[11px] max-h-20 overflow-y-auto bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              {typeof updateInfo.releaseNotes === 'string'
                ? updateInfo.releaseNotes.replace(/<[^>]*>?/gm, '')
                : 'Improvements and bug fixes.'}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition shadow-sm shadow-indigo-500/20"
            >
              Download Update
            </button>
          </div>
        </div>
      )}

      {/* ── Status: DOWNLOADING ── */}
      {updateStatus === 'downloading' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-sm animate-pulse">
              ⬇️
            </span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Downloading Update...
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {downloadProgress}% completed
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, downloadProgress)}%` }}
            />
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            You can continue studying without interruption. We will notify you when download completes.
          </p>
        </div>
      )}

      {/* ── Status: DOWNLOADED ── */}
      {updateStatus === 'downloaded' && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                🎉
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Update Ready to Install
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Version {updateInfo?.version || '1.0.1'} is downloaded
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition"
              aria-label="Dismiss update notification"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Restart Study Time Tracker to apply the update immediately, or choose Later to install automatically when you quit.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition shadow-sm shadow-emerald-500/20"
            >
              Restart & Install
            </button>
          </div>
        </div>
      )}

      {/* ── Status: ERROR ── */}
      {updateStatus === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 font-bold text-sm">
                ⚠️
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Update Failed
                </h4>
                <p className="text-xs text-red-500 dark:text-red-400 font-medium truncate max-w-[200px]">
                  {errorMessage}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Please check your internet connection or check again later in Settings &rarr; System.
          </p>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
