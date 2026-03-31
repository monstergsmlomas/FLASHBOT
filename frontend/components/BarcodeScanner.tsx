"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const BARCODE_FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "code_93",
  "itf", "codabar", "qr_code", "data_matrix",
];

export function BarcodeScanner({
  onDetected, onClose,
  title = "Escanear código",
  subtitle = "Apuntá la cámara al código de barra",
}: BarcodeScannerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const doneRef     = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // 1. Pedir cámara trasera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        // 2. Intentar BarcodeDetector nativo (Chrome Android, Edge)
        if ("BarcodeDetector" in window) {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats?.() ?? BARCODE_FORMATS;
          const formats   = BARCODE_FORMATS.filter(f => supported.includes(f));
          detectorRef.current = new (window as any).BarcodeDetector({ formats: formats.length ? formats : BARCODE_FORMATS });

          const scanFrame = async () => {
            if (cancelled || doneRef.current) return;
            const video = videoRef.current;
            if (video && video.readyState >= 2) {
              try {
                const barcodes = await detectorRef.current.detect(video);
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  doneRef.current = true;
                  if (navigator.vibrate) navigator.vibrate(100);
                  cleanup();
                  onDetected(code);
                  return;
                }
              } catch (_) {}
            }
            rafRef.current = requestAnimationFrame(scanFrame);
          };
          rafRef.current = requestAnimationFrame(scanFrame);

        } else {
          // 3. Fallback: html5-qrcode (solo si BarcodeDetector no está disponible)
          const { Html5Qrcode } = await import("html5-qrcode");
          const scanner = new Html5Qrcode("barcode-video-fallback", { verbose: false });
          (detectorRef as any).current = { _html5: scanner };
          await scanner.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 280, height: 140 } },
            (text: string) => {
              if (doneRef.current || cancelled) return;
              doneRef.current = true;
              if (navigator.vibrate) navigator.vibrate(100);
              scanner.stop().catch(() => {});
              onDetected(text);
            },
            () => {}
          );
        }

      } catch (e: any) {
        if (cancelled) return;
        const msg = (e?.message ?? "").toLowerCase();
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
          setError("Permiso de cámara denegado. Permitilo desde la configuración del navegador.");
        } else {
          setError("No se pudo iniciar la cámara. Usá HTTPS y permitı́ el acceso.");
        }
      }
    };

    const cleanup = () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const d = detectorRef.current;
      if (d?._html5) d._html5.stop().catch(() => {});
    };

    start();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Camera size={16} color="#a78bfa" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "white", fontSize: 14 }}>{title}</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Visor de cámara */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {error ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              padding: "20px 24px", borderRadius: 16, maxWidth: 320,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{error}</p>
              <button onClick={onClose} style={{
                marginTop: 16, padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5", fontSize: 13, fontWeight: 600,
              }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            {/* Video nativo (BarcodeDetector) */}
            {"BarcodeDetector" in (typeof window !== "undefined" ? window : {}) ? (
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              /* Fallback html5-qrcode */
              <div id="barcode-video-fallback" style={{ width: "100%", height: "100%" }} />
            )}

            {/* Guía visual - rectángulo para apuntar */}
            {scanning && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                {/* Overlay oscuro arriba y abajo */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)",
                }} />
                {/* Marco del visor */}
                <div style={{
                  width: "85%", height: 120, position: "relative",
                  border: "2px solid rgba(124,58,237,0.8)",
                  borderRadius: 12,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}>
                  {/* Línea de escaneo animada */}
                  <div style={{
                    position: "absolute", left: 8, right: 8, top: "50%",
                    height: 2,
                    background: "linear-gradient(90deg, transparent, #a78bfa, transparent)",
                    animation: "scan 1.5s ease-in-out infinite",
                  }} />
                  {/* Esquinas */}
                  {([
                    { top: -2, left: -2, borderTop: "3px solid #7c3aed", borderLeft: "3px solid #7c3aed", borderRadius: "10px 0 0 0" },
                    { top: -2, right: -2, borderTop: "3px solid #7c3aed", borderRight: "3px solid #7c3aed", borderRadius: "0 10px 0 0" },
                    { bottom: -2, left: -2, borderBottom: "3px solid #7c3aed", borderLeft: "3px solid #7c3aed", borderRadius: "0 0 0 10px" },
                    { bottom: -2, right: -2, borderBottom: "3px solid #7c3aed", borderRight: "3px solid #7c3aed", borderRadius: "0 0 10px 0" },
                  ] as React.CSSProperties[]).map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
                  ))}
                </div>
              </div>
            )}

            {!scanning && !error && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.5)", fontSize: 14,
              }}>
                Iniciando cámara...
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {scanning && (
        <div style={{
          padding: "14px 24px 28px", textAlign: "center",
          background: "rgba(0,0,0,0.8)",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Centrá el código dentro del recuadro
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            EAN-13 · EAN-8 · UPC · Code-128 · QR
          </p>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%   { transform: translateY(-30px); opacity: 0.3; }
          50%  { transform: translateY(0px);   opacity: 1; }
          100% { transform: translateY(30px);  opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
