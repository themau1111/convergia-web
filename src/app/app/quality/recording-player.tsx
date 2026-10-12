"use client";

import { useState } from "react";
import { getRecordingUrlAction } from "./actions";

export function RecordingPlayer({ callUuid }: { callUuid: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecordingUrlAction(callUuid);
      setUrl(data.url);
    } catch {
      setError("No se pudo cargar la grabación");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  if (url) {
    return (
      <div className="recording-player">
        <audio controls preload="none" src={url} style={{ width: "100%" }} />
        <a href={url} download={`${callUuid}.wav`} className="secondary-action">
          Descargar WAV
        </a>
      </div>
    );
  }

  return (
    <button onClick={load} disabled={loading} className="secondary-action">
      {loading ? "Cargando..." : "Escuchar grabación"}
    </button>
  );
}
