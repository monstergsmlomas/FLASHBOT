"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const FORMATS = [
  "ean_13","ean_8","upc_a","upc_e",
  "code_128","code_39","code_93","itf","codabar","qr_code",
];

export function BarcodeScanner({
  onDetected, onClose,
  title    = "Escanear código",
  subtitle = "Apuntá la cámara al código de barra",
}: BarcodeScannerProps) {
  // "idle" → montando | "scanning" → activo | "error" → falló
  const [status,    setStatus]    = useState<"idle"|"scanning"|"error">("idle");
  const [errMsg,    setErrMsg]    = useState("");
  // null = sin determinar (SSR), true = usar BarcodeDetector, false = html5-qrcode
  const [useNative, setUseNative] = useState<boolean|null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const rafRef    = useRef<number|null>(null);
  const doneRef   = useRef(false);
  const CONTAINER = "bs-html5-container";

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    const handleResult = (code: string) => {
      if (doneRef.current || cancelled) return;
      doneRef.current = true;
      navigator.vibrate?.(100);
      stop();
      onDetected(code);
    };

    const handleError = (msg: string) => {
      if (cancelled) return;
      setErrMsg(msg);
      setStatus("error");
    };

    // ── Intento 1: BarcodeDetector nativo (Chrome Android / Edge) ──────────
    const tryNative = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStatus("scanning");

        const supported = await (window as any).BarcodeDetector
          .getSupportedFormats?.() ?? FORMATS;
        const formats = FORMATS.filter(f => supported.includes(f));
        const detector = new (window as any).BarcodeDetector({
          formats: formats.length ? formats : FORMATS,
        });

        const tick = async () => {
          if (cancelled || doneRef.current) return;
          if (video.readyState >= 2) {
            try {
              const results = await detector.detect(video);
              if (results.length) { handleResult(results[0].rawValue); return; }
            } catch (_) {}
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (cancelled) return;
        const m = (e?.message ?? "").toLowerCase();
        if (m.includes("permission") || m.includes("denied") || m.includes("notallowed")) {
          handleError("Permiso de cámara denegado. Habilitalo en la configuración del navegador.");
        } else {
          // BarcodeDetector falló → intentar html5-qrcode
          await tryHtml5();
        }
      }
    };

    // ── Intento 2: html5-qrcode (iOS Safari, Firefox, etc.) ────────────────
    const tryHtml5 = async () => {
      if (cancelled) return;
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(CONTAINER, { verbose: false });
        if (cancelled) return;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 260, height: 120 } },
          (text: string) => {
            scanner.stop().catch(()=>{});
            handleResult(text);
          },
          () => {}
        );
        if (!cancelled) setStatus("scanning");

        // guardar referencia para cleanup
        (streamRef as any).current = { _h5: scanner };
      } catch (e: any) {
        const m = (e?.message ?? "").toLowerCase();
        if (m.includes("permission") || m.includes("denied")) {
          handleError("Permiso de cámara denegado. Habilitalo en la configuración del navegador.");
        } else {
          handleError("No se pudo iniciar la cámara. Asegurate de usar HTTPS.");
        }
      }
    };

    // Cleanup especial para html5-qrcode
    const fullStop = () => {
      const ref = streamRef.current as any;
      if (ref?._h5) ref._h5.stop().catch(()=>{});
      stop();
    };

    // Elegir método según soporte del navegador (solo en cliente)
    const native = "BarcodeDetector" in window;
    setUseNative(native);
    if (native) {
      tryNative();
    } else {
      tryHtml5();
    }

    return fullStop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"#000",
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{
        padding:"16px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(0,0,0,0.85)",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:34,height:34,borderRadius:10,
            background:"rgba(124,58,237,0.25)",border:"1px solid rgba(124,58,237,0.4)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <Camera size={16} color="#a78bfa"/>
          </div>
          <div>
            <p style={{margin:0,fontWeight:700,color:"white",fontSize:14}}>{title}</p>
            <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          width:34,height:34,borderRadius:10,cursor:"pointer",
          background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",
          color:"white",display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          <X size={16}/>
        </button>
      </div>

      {/* Área principal */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>

        {status === "error" ? (
          <div style={{
            height:"100%",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",padding:24,
          }}>
            <div style={{
              padding:"20px 24px",borderRadius:16,maxWidth:320,textAlign:"center",
              background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",
              color:"#fca5a5",
            }}>
              <p style={{margin:0,fontSize:14,lineHeight:1.6}}>{errMsg}</p>
              <button onClick={onClose} style={{
                marginTop:16,padding:"8px 20px",borderRadius:8,cursor:"pointer",
                background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.4)",
                color:"#fca5a5",fontSize:13,fontWeight:600,
              }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            {/* Video para BarcodeDetector nativo */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width:"100%", height:"100%", objectFit:"cover",
                display: useNative === true ? "block" : "none",
              }}
            />
            {/* Contenedor para html5-qrcode (iOS / Firefox) */}
            <div
              id={CONTAINER}
              style={{
                width:"100%", height:"100%",
                display: useNative === false ? "block" : "none",
              }}
            />

            {/* Overlay visor */}
            {status === "scanning" && (
              <div style={{
                position:"absolute",inset:0,
                display:"flex",alignItems:"center",justifyContent:"center",
                pointerEvents:"none",
              }}>
                <div style={{
                  position:"absolute",inset:0,
                  background:"linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 28%,transparent 72%,rgba(0,0,0,0.45) 100%)",
                }}/>
                <div style={{
                  width:"88%",height:110,position:"relative",
                  border:"2px solid rgba(124,58,237,0.85)",
                  borderRadius:12,
                  boxShadow:"0 0 0 9999px rgba(0,0,0,0.4)",
                }}>
                  <div style={{
                    position:"absolute",left:8,right:8,top:"50%",
                    height:2,
                    background:"linear-gradient(90deg,transparent,#a78bfa,transparent)",
                    animation:"bsscan 1.5s ease-in-out infinite",
                  }}/>
                  {([
                    {top:-2,left:-2,borderTop:"3px solid #7c3aed",borderLeft:"3px solid #7c3aed",borderRadius:"10px 0 0 0"},
                    {top:-2,right:-2,borderTop:"3px solid #7c3aed",borderRight:"3px solid #7c3aed",borderRadius:"0 10px 0 0"},
                    {bottom:-2,left:-2,borderBottom:"3px solid #7c3aed",borderLeft:"3px solid #7c3aed",borderRadius:"0 0 0 10px"},
                    {bottom:-2,right:-2,borderBottom:"3px solid #7c3aed",borderRight:"3px solid #7c3aed",borderRadius:"0 0 10px 0"},
                  ] as React.CSSProperties[]).map((s,i)=>(
                    <div key={i} style={{position:"absolute",width:22,height:22,...s}}/>
                  ))}
                </div>
              </div>
            )}

            {status === "idle" && (
              <div style={{
                position:"absolute",inset:0,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"rgba(255,255,255,0.4)",fontSize:14,
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
          padding:"14px 24px 28px",textAlign:"center",
          background:"rgba(0,0,0,0.85)",
        }}>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.5)"}}>
            Centrá el código dentro del recuadro
          </p>
          <p style={{margin:"3px 0 0",fontSize:11,color:"rgba(255,255,255,0.25)"}}>
            EAN-13 · EAN-8 · UPC · Code-128 · QR
          </p>
        </div>
      )}

      <style>{`
        @keyframes bsscan {
          0%   { transform:translateY(-28px); opacity:.3; }
          50%  { transform:translateY(0);     opacity:1; }
          100% { transform:translateY(28px);  opacity:.3; }
        }
      `}</style>
    </div>
  );
}
