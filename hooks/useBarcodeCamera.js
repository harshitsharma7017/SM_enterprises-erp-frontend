'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Camera barcode scanning that works on the devices the shop floor actually
 * carries.
 *
 * Two things make this more than a `getUserMedia` call:
 *
 * 1. Decoding. Chrome on Android has a native `BarcodeDetector`; Safari does
 *    not, and since every iOS browser is WebKit underneath, no iPhone or iPad
 *    has one. Firefox has none either. So the native detector is used when it
 *    is present *and* speaks Code 128, and otherwise we lazily pull in a
 *    ZXing WebAssembly decoder with the same interface. The import is dynamic
 *    so the ~1 MB decoder is fetched only by the devices that need it, and only
 *    once the user actually asks for the camera.
 *
 * 2. Secure context. `navigator.mediaDevices` simply does not exist on a plain
 *    HTTP origin other than localhost. Visiting the dev server from a phone at
 *    `http://192.168.x.x:3000` therefore looks identical to an unsupported
 *    browser, which sends people hunting for the wrong problem. We check
 *    `isSecureContext` first and say which of the two it is. See `dev:https`
 *    in package.json for testing this on a real device.
 *
 * Scanning is continuous: the camera stays on until it is stopped, and each
 * distinct value is reported once per session. That suits the multi-scan flows
 * (dispatch, material issue) where the alternative is re-opening the camera for
 * every lot. Re-reading the same label is the one thing it will not do, since
 * every scan is written to the immutable scan history — stop and restart, or
 * type the value, to deliberately scan something twice.
 *
 * The caller owns the <video> ref and passes it in, rather than the hook
 * returning one: a ref handed back inside the result object would make every
 * other field of that object unreadable during render under the ref-safety
 * rules.
 */

// Only Code 128 is requested: every label this app prints is Code 128 subset B
// (see components/barcode/code128.js). Narrowing the formats is also the
// documented way to keep the detector fast.
const FORMATS = ['code_128'];

// Matches the path written by scripts/copy-decoder-wasm.mjs.
const WASM_PATH = '/wasm/zxing_reader.wasm';

const DETECT_INTERVAL_MS = 250;

/** Resolved once per page load; the WASM compile is the expensive part. */
let ponyfillPromise = null;

async function loadPonyfillDetector() {
  if (!ponyfillPromise) {
    ponyfillPromise = import('barcode-detector/ponyfill')
      .then((mod) => {
        // Serve the binary from our own origin instead of the upstream default,
        // which is a CDN the warehouse may not be able to reach.
        mod.prepareZXingModule({
          overrides: { locateFile: (file) => (file.endsWith('.wasm') ? WASM_PATH : file) },
          fireImmediately: false,
        });
        return mod.BarcodeDetector;
      })
      .catch((err) => {
        // Don't cache a failure: retrying shouldn't require a page reload.
        ponyfillPromise = null;
        throw err;
      });
  }
  const Detector = await ponyfillPromise;
  return new Detector({ formats: FORMATS });
}

async function nativeSpeaksCode128() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return false;
  try {
    // Present but format-limited is a real combination (it depends on the OS
    // vision framework), and constructing with an unsupported format throws.
    const supported = await window.BarcodeDetector.getSupportedFormats();
    return FORMATS.every((format) => supported.includes(format));
  } catch {
    return false;
  }
}

async function resolveDetector() {
  if (await nativeSpeaksCode128()) {
    return new window.BarcodeDetector({ formats: FORMATS });
  }
  return loadPonyfillDetector();
}

/**
 * @param {object} options
 * @param {import('react').RefObject<HTMLVideoElement>} options.videoRef Ref on the preview <video>.
 * @param {(value: string) => void} options.onDetect Called once per distinct value.
 * @param {boolean} [options.enabled] Whether the camera may be started at all.
 */
export function useBarcodeCamera({ videoRef, onDetect, enabled = true }) {
  const [stream, setStream] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const detectorRef = useRef(null);
  const seenRef = useRef(null);
  // Mirrors the stream state so `stop` can release the hardware without
  // reaching into a state updater, which React may run more than once.
  const streamRef = useRef(null);
  // `onDetect` is typically an inline arrow, so read it through a ref rather
  // than making it a dependency that restarts the scan loop on every render.
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    seenRef.current = null;
    setStream(null);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Releases the camera both when scanning is switched off and on unmount:
  // leaving a track live keeps the hardware indicator on and holds the device
  // against other tabs. Expressed as a cleanup so no state is set from an
  // effect body.
  useEffect(() => {
    if (!enabled) return undefined;
    return stop;
  }, [enabled, stop]);

  const start = useCallback(async () => {
    setError(null);

    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setError({
        kind: 'insecure',
        message: `The camera needs a secure connection. This page is on ${window.location.protocol}//${window.location.host}, so the browser withholds camera access. Open the app over HTTPS (or on localhost) to scan, or use a handheld scanner.`,
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ kind: 'unsupported', message: 'This browser cannot open a camera. Use a handheld scanner or type the barcode.' });
      return;
    }

    setStarting(true);
    try {
      if (!detectorRef.current) {
        try {
          detectorRef.current = await resolveDetector();
        } catch {
          // Almost always the decoder download: offline, or the WASM missing
          // from public/ because predev/prebuild did not run.
          setError({ kind: 'decoder', message: 'The barcode decoder could not be loaded, so the camera would have nothing to read with. Check the connection and try again, or use a handheld scanner.' });
          return;
        }
      }

      const media = await navigator.mediaDevices.getUserMedia({
        // A 1D barcode needs horizontal detail to resolve its bars, so ask for
        // a wide frame; the browser clamps this to whatever the camera has.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const [track] = media.getVideoTracks();
      setTorchAvailable(Boolean(track?.getCapabilities?.().torch));
      seenRef.current = new Set();
      streamRef.current = media;
      setStream(media);
    } catch (err) {
      setError({ kind: 'failed', message: describeStartFailure(err) });
    } finally {
      setStarting(false);
    }
  }, []);

  // Attach the stream to the element and run the detect loop. Keyed on the
  // stream, so the <video> the caller renders alongside it is already committed
  // to the DOM by the time this runs.
  useEffect(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!stream || !video || !detector) return undefined;

    video.srcObject = stream;
    video.play().catch(() => {
      /* Autoplay can be refused; the user can tap the frame to start it. */
    });

    let cancelled = false;
    // A WASM decode can outlast the interval. Without this guard the calls
    // stack up and the device falls behind the camera.
    let decoding = false;

    const timer = setInterval(async () => {
      if (cancelled || decoding) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      decoding = true;
      try {
        const found = await detector.detect(video);
        if (cancelled) return;
        for (const { rawValue } of found) {
          const code = String(rawValue || '').trim();
          const seen = seenRef.current;
          if (!code || !seen || seen.has(code)) continue;
          seen.add(code);
          onDetectRef.current?.(code);
        }
      } catch {
        /* An unreadable frame. Keep going. */
      } finally {
        decoding = false;
      }
    }, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  const toggleTorch = useCallback(async () => {
    const [track] = streamRef.current?.getVideoTracks() || [];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  return { active: stream !== null, starting, error, start, stop, torchOn, torchAvailable, toggleTorch };
}

function describeStartFailure(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was refused. Allow camera access for this site in your browser settings, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No usable camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is already in use by another app or tab.';
    default:
      return 'The camera could not be started. Check the connection and try again, or use a handheld scanner.';
  }
}
