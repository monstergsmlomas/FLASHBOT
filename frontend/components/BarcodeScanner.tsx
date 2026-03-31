"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const FORMATS = ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf","qr_code"];

export function BarcodeScanner({
  onDetected, onClose,
  title    = "Escanear código",
  subtitle = "Apuntá la cámara al código de barra",
}: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const rafRef    = useRef<number|null>(null);
  const doneRef   = useRef(false);

  const [status, setStatus] = useState<"idle"|"scanning"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const start = async () => {
      // ── Chequear soporte ────────────────────────────────────────────────
      if (!("BarcodeDetector" in window)) {
        setErrMsg(
          "Tu navegador no soporta escaneo de códigos de barra.\n\n" +
          "Usá Chrome en Android, o actualizá Safari a iOS 17.4+."
        );
        setStatus("error");
        return;
      }

      try {
        // ── Abrir cámara trasera ──────────────────────────────────────────
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStatus("scanning");

        // ── Crear detector ────────────────────────────────────────────────
        const supported: string[] = await (window as any).BarcodeDetector
          .getSupportedFormats?.() ?? FORMATS;
        const formats = FORMATS.filter(f => supported.includes(f));
        const detector = new (window as any).BarcodeDetector({
          formats: formats.length ? formats : FORMATS,
        });

        // ── Loop de detección ─────────────────────────────────────────────
        const tick = async () => {
          if (cancelled || doneRef.current) return;
          if (video.readyState >= 2) {
            try {
              const results: any[] = await detector.detect(video);
              if (results.length > 0) {
                const code = results[0].rawValue;
                doneRef.current = true;
                navigator.vibrate?.(100);
                cleanup();
                onDetected(code);
                return;
              }
            } catch (_) { /* frame vacío — ignorar */ }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

      } catch (e: any) {
        if (cancelled) return;
        const m = (e?.message ?? "").toLowerCase();
        if (m.includes("permission") || m.includes("denied") || m.includes("notallowed")) {
          setErrMsg("Permiso de cámara denegado. Habilitalo en Configuración > Safari/Chrome > Cámara.");
        } else {
          setErrMsg("No se pudo abrir la cámara: " + (e?.message ?? "error desconocido"));
        }
        setStatus("error");
      }
    };

    start();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:99999, background:"#000", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{
        padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(0,0,0,0.85)", borderBottom:"1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
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
        <button onClick={onClose} style={{
          width:34, height:34, borderRadius:10, cursor:"pointer", flexShrink:0,
          background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
          color:"white", display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <X size={16} />
        </button>
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
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
            />

            {/* Overlay visor */}
            {status === "scanning" && (
              <div style={{
                position:"absolute", inset:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                pointerEvents:"none",
              }}>
                <div style={{
                  position:"absolute", inset:0,
                  background:"linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.45) 100%)",
                }} />
                {/* Recuadro de escaneo */}
                <div style={{
                  width:"88%", height:110, position:"relative",
                  border:"2px solid rgba(124,58,237,0.9)",
                  borderRadius:12,
                  boxShadow:"0 0 0 9999px rgba(0,0,0,0.42)",
                }}>
                  {/* Línea de escaneo */}
                  <div style={{
                    position:"absolute", left:8, right:8, top:"50%",
                    height:2,
                    background:"linear-gradient(90deg, transparent, #a78bfa, transparent)",
                    animation:"scan 1.5s ease-in-out infinite",
                  }} />
                  {/* Esquinas */}
                  {([
                    { top:-2, left:-2,  borderTop:"3px solid #7c3aed",    borderLeft:"3px solid #7c3aed",   borderRadius:"10px 0 0 0" },
                    { top:-2, right:-2, borderTop:"3px solid #7c3aed",    borderRight:"3px solid #7c3aed",  borderRadius:"0 10px 0 0" },
                    { bottom:-2, left:-2,  borderBottom:"3px solid #7c3aed", borderLeft:"3px solid #7c3aed",   borderRadius:"0 0 0 10px" },
                    { bottom:-2, right:-2, borderBottom:"3px solid #7c3aed", borderRight:"3px solid #7c3aed",  borderRadius:"0 0 10px 0" },
                  ] as React.CSSProperties[]).map((s, i) => (
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

      {/* Footer */}
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
          0%   { transform: translateY(-28px); opacity: 0.3; }
          50%  { transform: translateY(0px);   opacity: 1;   }
          100% { transform: translateY(28px);  opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
