"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Zap, ZapOff } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  onClose:    () => void;
  title?:     string;
  subtitle?:  string;
}

const SCANNER_ID = "html5-qrcode-scanner-region";

export function BarcodeScanner({
  onDetected, onClose,
  title    = "Escanear código",
  subtitle = "Apuntá la cámara al código de barra",
}: Props) {
  const scannerRef  = useRef<any>(null);
  const doneRef     = useRef(false);
  const streamRef   = useRef<MediaStream | null>(null);

  const [status,       setStatus]       = useState<"idle" | "scanning" | "error">("idle");
  const [errMsg,       setErrMsg]       = useState("");
  const [torchOn,      setTorchOn]      = useState(false);
  const [torchSupport, setTorchSupport] = useState(false);

  /* ── Linterna ── */
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (_) {}
  }, [torchOn]);

  useEffect(() => {
    let stopped = false;

    const stop = async () => {
      stopped = true;
      try {
        if (scannerRef.current) {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        }
      } catch (_) {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const start = async () => {
      try {
        // Importación dinámica para evitar SSR
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        if (stopped) return;

        const formatos = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        const scanner = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: formatos,
          verbose: false,
        });
        scannerRef.current = scanner;

        // Calcular el ancho del viewport para el qrbox
        const vw = Math.min(window.innerWidth, 480);
        const boxW = Math.round(vw * 0.82);
        const boxH = Math.round(boxW * 0.38); // proporción horizontal para códigos de barra

        await scanner.start(
          { facingMode: "environment" },  // cámara trasera, html5-qrcode lo maneja correctamente
          {
            fps: 15,                       // 15 frames/seg – balance rendimiento/batería
            qrbox: { width: boxW, height: boxH },
            aspectRatio: 1.7778,           // 16:9
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width:      { ideal: 1920 },
              height:     { ideal: 1080 },
            },
          },
          (decodedText) => {
            if (stopped || doneRef.current) return;
            doneRef.current = true;
            navigator.vibrate?.(100);
            stop();
            onDetected(decodedText);
          },
          () => { /* error silencioso por frame no detectado */ }
        );

        if (stopped) { stop(); return; }

        // Capturar referencia al stream para poder activar linterna
        try {
          const videoEl = document.querySelector<HTMLVideoElement>(`#${SCANNER_ID} video`);
          if (videoEl?.srcObject instanceof MediaStream) {
            streamRef.current = videoEl.srcObject;
            const track = streamRef.current.getVideoTracks()[0];
            const caps = track?.getCapabilities?.() as any;
            if (caps?.torch) setTorchSupport(true);
          }
        } catch (_) {}

        setStatus("scanning");

      } catch (e: any) {
        if (stopped) return;
        const m = (e?.message ?? "").toLowerCase();
        if (m.includes("permission") || m.includes("denied") || m.includes("notallowed")) {
          setErrMsg("Permiso de cámara denegado.\nHabilitalo en Configuración del dispositivo.");
        } else {
          setErrMsg("No se pudo iniciar la cámara.\n" + (e?.message ?? ""));
        }
        setStatus("error");
      }
    };

    start();
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#000", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.9)", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
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

        <div style={{ display: "flex", gap: 8 }}>
          {torchSupport && status === "scanning" && (
            <button
              onClick={toggleTorch}
              title={torchOn ? "Apagar linterna" : "Encender linterna"}
              style={{
                width: 34, height: 34, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                background: torchOn ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.08)",
                border: torchOn ? "1px solid rgba(250,204,21,0.5)" : "1px solid rgba(255,255,255,0.12)",
                color: torchOn ? "#fde047" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {torchOn ? <ZapOff size={16} /> : <Zap size={16} />}
            </button>
          )}
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10, cursor: "pointer", flexShrink: 0,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {status === "error" ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              padding: "24px", borderRadius: 16, maxWidth: 320, textAlign: "center",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5",
            }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line" }}>{errMsg}</p>
              <button onClick={onClose} style={{
                marginTop: 20, padding: "10px 24px", borderRadius: 8, cursor: "pointer",
                background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5", fontSize: 13, fontWeight: 600,
              }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            {/* Contenedor que html5-qrcode puebla con el <video> */}
            <div
              id={SCANNER_ID}
              style={{ width: "100%", height: "100%" }}
            />

            {/* Overlay de "iniciando" */}
            {status === "idle" && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.4)", fontSize: 14,
                pointerEvents: "none",
              }}>
                Iniciando cámara...
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {status === "scanning" && (
        <div style={{
          padding: "14px 24px 28px", textAlign: "center", flexShrink: 0,
          background: "rgba(0,0,0,0.9)",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Centrá el código dentro del recuadro
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            EAN-13 · EAN-8 · UPC · Code-128 · QR
          </p>
        </div>
      )}

      {/* Ocultar la UI nativa de html5-qrcode (botones, texto) */}
      <style>{`
        #${SCANNER_ID} > img,
        #${SCANNER_ID} > div > img { display: none !important; }
        #${SCANNER_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #${SCANNER_ID} { height: 100% !important; }
      `}</style>
    </div>
  );
}
