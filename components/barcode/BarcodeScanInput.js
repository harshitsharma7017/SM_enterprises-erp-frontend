'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm font-mono';

/**
 * One scan field for every scanner, with no vendor SDK:
 * - handheld (keyboard-wedge) scanners type the value and press Enter into
 *   the focused field — the field keeps focus after each scan;
 * - typing / pasting the value works the same way;
 * - the camera uses the browser's own BarcodeDetector API where available
 *   (e.g. Chrome on Android; needs HTTPS or localhost), and says so where not.
 * Every value goes to POST /barcodes/scan (company-scoped, recorded in the
 * scan history); `onResult` receives the resolved lot, `onError` a refusal.
 */
export default function BarcodeScanInput({ companyId, context = 'lookup', locationId = '', onResult, onError, disabled = false, autoFocus = false, placeholder = 'Scan or type a barcode, then Enter' }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const submit = useCallback(async (raw) => {
    const code = String(raw || '').trim();
    if (!code || busy) return;
    if (!companyId) {
      onError?.('Select the company you are working in first.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiClient.post('/barcodes/scan', { barcode: code, company_id: Number(companyId), context, location_id: locationId ? Number(locationId) : null });
      onResult?.(res.data, res);
    } catch (err) {
      onError?.(err.message || 'Scan failed', code);
    } finally {
      setValue('');
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [busy, companyId, context, locationId, onResult, onError]);

  const startCamera = async () => {
    setCameraError(null);
    if (typeof window === 'undefined' || !('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera scanning is not supported in this browser. Use a handheld scanner or type the barcode.');
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ['code_128'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCamera(true);
      // The <video> mounts on the next render.
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        timerRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found.length > 0) {
              stopCamera();
              submit(found[0].rawValue);
            }
          } catch {
            // A frame that cannot be read yet; keep trying.
          }
        }, 300);
      });
    } catch (err) {
      stopCamera();
      setCameraError(err?.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'The camera could not be started.');
    }
  };

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); submit(value); }} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={100}
          disabled={disabled || busy}
          className={INPUT}
          aria-label="Barcode"
        />
        <button type="submit" disabled={disabled || busy || !value.trim()} className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 whitespace-nowrap">
          <i className="bi bi-upc-scan me-1"></i> {busy ? 'Checking…' : 'Scan'}
        </button>
        <button type="button" onClick={camera ? stopCamera : startCamera} disabled={disabled} className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-nowrap" title="Scan with the device camera">
          <i className={`bi ${camera ? 'bi-camera-video-off' : 'bi-camera'} me-1`}></i> {camera ? 'Stop' : 'Camera'}
        </button>
      </form>
      {cameraError && <p className="text-xs text-amber-700 mt-1 mb-0">{cameraError}</p>}
      {camera && (
        <div className="mt-2">
          <video ref={videoRef} muted playsInline className="w-full max-w-md rounded border border-gray-300 bg-black" />
          <p className="text-xs text-gray-500 mt-1 mb-0">Point the camera at the barcode.</p>
        </div>
      )}
    </div>
  );
}
