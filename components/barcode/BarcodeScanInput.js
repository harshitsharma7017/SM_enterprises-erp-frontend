'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';

/**
 * One scan field for every scanner, with no vendor SDK:
 * - handheld (keyboard-wedge) scanners type the value and press Enter into
 *   the focused field — the field keeps focus after each scan;
 * - typing / pasting the value works the same way;
 * - the device camera decodes Code 128 in the browser, natively where that
 *   exists and via a WebAssembly decoder everywhere else, so it also works on
 *   iPhone / iPad and Firefox (see hooks/useBarcodeCamera.js).
 *
 * Every value goes to POST /barcodes/scan (company-scoped, recorded in the
 * scan history); `onResult` receives the resolved lot, `onError` a refusal.
 * Values are queued and submitted one at a time in arrival order, so a burst
 * from the camera is never silently dropped.
 */
export default function BarcodeScanInput({ companyId, context = 'lookup', locationId = '', onResult, onError, disabled = false, autoFocus = false, placeholder = 'Scan or type a barcode, then Enter' }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const inputRef = useRef(null);
  const videoRef = useRef(null);

  const queueRef = useRef([]);
  const drainingRef = useRef(false);
  const cameraOpenRef = useRef(false);

  // The drain loop outlives any one render, so it reads the live props through
  // a ref: a company or location changed mid-drain applies to the values still
  // waiting rather than to a stale closure.
  const configRef = useRef({ companyId, context, locationId, onResult, onError });
  useEffect(() => {
    configRef.current = { companyId, context, locationId, onResult, onError };
  }, [companyId, context, locationId, onResult, onError]);

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setBusy(true);
    try {
      while (queueRef.current.length > 0) {
        const code = queueRef.current.shift();
        const { companyId: company, context: ctx, locationId: location, onResult: resolved, onError: refused } = configRef.current;
        if (!company) {
          refused?.('Select the company you are working in first.');
          queueRef.current = [];
          break;
        }
        try {
          const res = await apiClient.post('/barcodes/scan', {
            barcode: code,
            company_id: Number(company),
            context: ctx,
            location_id: location ? Number(location) : null,
          });
          resolved?.(res.data, res);
        } catch (err) {
          refused?.(err.message || 'Scan failed', code);
        }
        setScanCount((n) => n + 1);
      }
    } finally {
      drainingRef.current = false;
      setBusy(false);
      // Re-focus for the next handheld scan, but not while the camera is open:
      // on a phone that would raise the on-screen keyboard over the viewfinder.
      if (!cameraOpenRef.current) inputRef.current?.focus();
    }
  }, []);

  const enqueue = useCallback((raw) => {
    const code = String(raw || '').trim();
    if (!code) return;
    queueRef.current.push(code);
    setValue('');
    drain();
  }, [drain]);

  const { active, starting, error, start, stop, torchOn, torchAvailable, toggleTorch } = useBarcodeCamera({ videoRef, onDetect: enqueue, enabled: !disabled });

  useEffect(() => {
    cameraOpenRef.current = active;
  }, [active]);

  // A company change invalidates anything still queued for the previous one.
  useEffect(() => {
    queueRef.current = [];
  }, [companyId]);

  const openCamera = () => {
    setScanCount(0);
    start();
  };

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); enqueue(value); }} className="flex gap-2">
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
          disabled={disabled}
          className="form-input"
          aria-label="Barcode"
        />
        <button type="submit" disabled={disabled || busy || !value.trim()} className="px-3 py-1.5 rounded text-sm font-medium bg-accent hover:bg-accent-hover text-white disabled:opacity-60 whitespace-nowrap">
          <i className="bi bi-upc-scan me-1"></i> {busy ? 'Checking…' : 'Scan'}
        </button>
        <button
          type="button"
          onClick={active ? stop : openCamera}
          disabled={disabled || starting}
          aria-pressed={active}
          className="px-3 py-1.5 rounded text-sm font-medium border border-line-strong text-fg-muted hover:bg-surface-hover disabled:opacity-60 whitespace-nowrap"
          title="Scan with the device camera"
        >
          <i className={`bi ${active ? 'bi-camera-video-off' : 'bi-camera'} me-1`}></i>
          {starting ? 'Starting…' : active ? 'Stop' : 'Camera'}
        </button>
      </form>

      {starting && !active && (
        <p className="text-xs text-fg-subtle mt-2 mb-0">
          <i className="bi bi-hourglass-split me-1"></i> Preparing the camera. The first use on this device also downloads the decoder.
        </p>
      )}

      {error && (
        <div className={`alert ${error.kind === 'insecure' ? 'alert-info' : 'alert-warning'} mt-2 mb-0`} role="status">
          <i className={`bi ${error.kind === 'insecure' ? 'bi-shield-lock' : 'bi-exclamation-triangle'}`}></i>
          <span>{error.message}</span>
        </div>
      )}

      {active && (
        <div className="mt-2">
          <div className="relative w-full max-w-md">
            <video ref={videoRef} muted playsInline className="w-full rounded border border-line-strong bg-black aspect-video object-cover" />
            {/* A soft aiming guide. Detection runs on the whole frame, so a
                barcode outside the guide still scans — it just helps people
                hold the phone at a readable distance. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] inset-y-[30%] rounded border-2 border-white/70"></div>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-xs text-fg-subtle mb-0">Point the camera at the barcode. Scanning stays on — keep going lot by lot.</p>
            {torchAvailable && (
              <button type="button" onClick={toggleTorch} aria-pressed={torchOn} className="text-xs text-link hover:underline whitespace-nowrap">
                <i className={`bi ${torchOn ? 'bi-lightbulb-fill' : 'bi-lightbulb'} me-1`}></i>
                {torchOn ? 'Light off' : 'Light on'}
              </button>
            )}
          </div>
          {scanCount > 0 && (
            <p className="text-xs text-fg-subtle mt-1 mb-0" aria-live="polite">
              {scanCount} scanned since the camera opened. Each label reads once — stop and start the camera to re-read one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
