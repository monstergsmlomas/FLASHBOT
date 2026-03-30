"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Flashlight } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function BarcodeScanner({ onDetected, onClose, title = "Escanear código", subtitle = "Apuntá la cámara al código de barra del producto" }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const containerId = "barcode-scanner-container";

  useEffect(() => {
    let stopped = false;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setError("No se encontró ninguna cámara en el dispositivo.");
          return;
        }

        // Preferir cámara trasera en móvil
        const backCamera = cameras.find(c =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("trasera") ||
          c.label.toLowerCase().includes("environment")
        ) ?? cameras[cameras.length - 1];

        await scanner.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decodedText) => {
            if (stopped) return;
            setLastScan(decodedText);
            // Vibrar si el dispositivo lo soporta
            if (navigator.vibrate) navigator.vibrate(100);
            stopped = true;
            scanner.stop().then(() => onDetected(decodedText)).catch(() => onDetected(decodedText));
          },
          () => {} // error de frame — ignorar
        );
        setScanning(true);
      } catch (e: any) {
        if (e?.message?.includes("permission") || e?.message?.includes("Permission")) {
          setError("Permiso de cámara denegado. Permitilo desde la configuración del navegador.");
        } else {
          setError("No se pudo iniciar la cámara. Asegurate de usar HTTPS o localhost.");
        }
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.95)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Camera size={18} color="#a78bfa" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "white", fontSize: 15 }}>{title}</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Scanner area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: 24 }}>
        {error ? (
          <div style={{
            padding: "20px 24px", borderRadius: 16,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", textAlign: "center", maxWidth: 320,
          }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{error}</p>
            <button
              onClick={onClose}
              style={{
                marginTop: 16, padding: "8px 20px", borderRadius: 8,
                background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
            {/* Visor con esquinas decorativas */}
            <div style={{ position: "relative" }}>
              <div id={containerId} style={{ borderRadius: 16, overflow: "hidden", width: "100%" }} />
              {scanning && (
                <>
                  {/* Esquinas del visor */}
                  {[
                    { top: 0, left: 0, borderTop: "3px solid #7c3aed", borderLeft: "3px solid #7c3aed", borderRadius: "12px 0 0 0" },
                    { top: 0, right: 0, borderTop: "3px solid #7c3aed", borderRight: "3px solid #7c3aed", borderRadius: "0 12px 0 0" },
                    { bottom: 0, left: 0, borderBottom: "3px solid #7c3aed", borderLeft: "3px solid #7c3aed", borderRadius: "0 0 0 12px" },
                    { bottom: 0, right: 0, borderBottom: "3px solid #7c3aed", borderRight: "3px solid #7c3aed", borderRadius: "0 0 12px 0" },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 28, height: 28, ...s }} />
                  ))}
                </>
              )}
            </div>

            {!scanning && !error && (
              <div style={{ textAlign: "center", paddingTop: 32, color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Iniciando cámara...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer instrucciones */}
      {scanning && (
        <div style={{
          width: "100%", padding: "16px 24px 32px",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Centrá el código de barra dentro del recuadro
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            Compatible con EAN-13, EAN-8, UPC-A, Code-128, QR
          </p>
        </div>
      )}
    </div>
  );
}
