"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Zap, ZapOff } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  onClose:    () => void;
  title?:     string;
  subtitle?:  string;
}

export function BarcodeScanner({
  onDetected, onClose,
  title    = "Escanear código",
  subtitle = "Apuntá la cámara al código de barra",
}: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const readerRef     = useRef<any>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const doneRef       = useRef(false);

  const [status,       setStatus]       = useState<"idle"|"scanning"|"error">("idle");
  const [errMsg,       setErrMsg]       = useState("");
  const [torchOn,      setTorchOn]      = useState(false);
  const [torchSupport, setTorchSupport] = useState(false);

  /* ─── Torch toggle ─── */
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
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      try { readerRef.current?.reset(); } catch (_) {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const start = async () => {
      try {
        // ── 1. Obtener stream con constraints optimizadas para móvil ──
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },   // cámara trasera
            width:      { ideal: 1920 },
            height:     { ideal: 1080 },
            // @ts-ignore – focusMode no está en los types pero sí en la spec
            focusMode:  { ideal: "continuous" },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // ── 2. Activar autofocus continuo en el track ──
        const track = stream.getVideoTracks()[0];
        try {
          const caps = track.getCapabilities() as any;
          const advanced: any = {};
          if (caps.focusMode?.includes("continuous")) {
            advanced.focusMode = "continuous";
          }
          if (Object.keys(advanced).length) {
            await track.applyConstraints({ advanced: [advanced] });
          }
          // Detectar soporte de linterna
          if (caps.torch) setTorchSupport(true);
        } catch (_) {}

        // ── 3. Conectar stream al elemento <video> ──
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("autoplay", "true");
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }

        if (cancelled) return;

        // ── 4. Iniciar lector ZXing sobre ese stream ──
        const { BrowserMultiFormatReader, BarcodeFormat } =
          await import("@zxing/browser");
        const { DecodeHintType } = await import("@zxing/library");

        if (cancelled) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        // Intentar múltiples veces antes de descartar un frame
        hints.set(DecodeHintType.ALSO_INVERTED, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,   // más intentos por segundo
        });
        readerRef.current = reader;

        // Decodificar sobre el elemento <video> que ya tiene el stream
        reader.decodeFromVideoElement(
          videoRef.current!,
          (result, err) => {
            if (cancelled || doneRef.current) return;
            if (result) {
              doneRef.current = true;
              navigator.vibrate?.(100);
              stop();
              onDetected(result.getText());
            }
          }
        );

        if (!cancelled) setStatus("scanning");

      } catch (e: any) {
        if (cancelled) return;
        const m = (e?.message ?? "").toLowerCase();
        if (m.includes("permission") || m.includes("denied") || m.includes("notallowed")) {
          setErrMsg("Permiso de cámara denegado.\nHabilitalo en Configuración del dispositivo.");
        } else if (m.includes("overconstrained") || m.includes("constraint")) {
          // Fallback sin constraints avanzadas
          setErrMsg("No se pudo acceder a la cámara trasera.\nIntentá desde otra app o revisá los permisos.");
        } else {
          setErrMsg("No se pudo iniciar la cámara.\n" + (e?.message ?? ""));
        }
        setStatus("error");
      }
    };

    start();
    return stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:99999, background:"#000", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{
        padding:"16px 20px", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(0,0,0,0.85)", borderBottom:"1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:10, flexShrink:0,
            background:"rgba(124,58,237,0.25)", border:"1px solid rgba(124,58,237,0.4)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Camera size={16} color="#a78bfa" />
          </div>
          <div>
            <p style={{ margin:0, fontWeight:700, color:"white", fontSize:14 }}>{title}</p>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{subtitle}</p>
          </div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          {/* Botón linterna */}
          {torchSupport && status === "scanning" && (
            <button
              onClick={toggleTorch}
              title={torchOn ? "Apagar linterna" : "Encender linterna"}
              style={{
                width:34, height:34, borderRadius:10, cursor:"pointer", flexShrink:0,
                background: torchOn ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.08)",
                border: torchOn ? "1px solid rgba(250,204,21,0.5)" : "1px solid rgba(255,255,255,0.12)",
                color: torchOn ? "#fde047" : "white",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}
            >
              {torchOn ? <ZapOff size={16} /> : <Zap size={16} />}
            </button>
          )}

          <button onClick={onClose} style={{
            width:34, height:34, borderRadius:10, cursor:"pointer", flexShrink:0,
            background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
            color:"white", display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Área de cámara */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        {status === "error" ? (
          <div style={{
            height:"100%", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", padding:24,
          }}>
            <div style={{
              padding:"24px", borderRadius:16, maxWidth:320, textAlign:"center",
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5",
            }}>
              <p style={{ margin:0, fontSize:14, lineHeight:1.7, whiteSpace:"pre-line" }}>{errMsg}</p>
              <button onClick={onClose} style={{
                marginTop:20, padding:"10px 24px", borderRadius:8, cursor:"pointer",
                background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)",
                color:"#fca5a5", fontSize:13, fontWeight:600,
              }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            {/* Video: el stream se asigna por srcObject, no por deviceId */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
            />

            {status === "scanning" && (
              <div style={{
                position:"absolute", inset:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                pointerEvents:"none",
              }}>
                <div style={{
                  position:"absolute", inset:0,
                  background:"linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.45) 100%)",
                }} />
                {/* Ventana de escaneo más ancha para facilitar el encuadre */}
                <div style={{
                  width:"90%", maxWidth:380, height:120, position:"relative",
                  border:"2px solid rgba(124,58,237,0.9)", borderRadius:12,
                  boxShadow:"0 0 0 9999px rgba(0,0,0,0.42)",
                }}>
                  {/* Línea de barrido animada */}
                  <div style={{
                    position:"absolute", left:8, right:8, top:"50%", height:2,
                    background:"linear-gradient(90deg, transparent, #a78bfa, transparent)",
                    animation:"scan 1.8s ease-in-out infinite",
                  }} />
                  {/* Esquinas decorativas */}
                  {([
                    { top:-2,    left:-2,  borderTop:"3px solid #7c3aed",    borderLeft:"3px solid #7c3aed",   borderRadius:"10px 0 0 0" },
                    { top:-2,    right:-2, borderTop:"3px solid #7c3aed",    borderRight:"3px solid #7c3aed",  borderRadius:"0 10px 0 0" },
                    { bottom:-2, left:-2,  borderBottom:"3px solid #7c3aed", borderLeft:"3px solid #7c3aed",   borderRadius:"0 0 0 10px" },
                    { bottom:-2, right:-2, borderBottom:"3px solid #7c3aed", borderRight:"3px solid #7c3aed",  borderRadius:"0 0 10px 0" },
                  ] as React.CSSProperties[]).map((s,i) => (
                    <div key={i} style={{ position:"absolute", width:22, height:22, ...s }} />
                  ))}
                </div>
              </div>
            )}

            {status === "idle" && (
              <div style={{
                position:"absolute", inset:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.4)", fontSize:14,
              }}>
                Iniciando cámara...
              </div>
            )}
          </>
        )}
      </div>

      {status === "scanning" && (
        <div style={{
          padding:"14px 24px 28px", textAlign:"center", flexShrink:0,
          background:"rgba(0,0,0,0.85)",
        }}>
          <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.5)" }}>
            Centrá el código dentro del recuadro
          </p>
          <p style={{ margin:"3px 0 0", fontSize:11, color:"rgba(255,255,255,0.25)" }}>
            EAN-13 · EAN-8 · UPC · Code-128 · QR
          </p>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%   { transform: translateY(-32px); opacity:.3; }
          50%  { transform: translateY(0);     opacity:1;  }
          100% { transform: translateY(32px);  opacity:.3; }
        }
      `}</style>
    </div>
  );
}
