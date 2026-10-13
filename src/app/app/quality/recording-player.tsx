"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, Loader2Icon, PauseIcon, PhoneOffIcon, PlayIcon, RefreshCwIcon } from "lucide-react";
import { getRecordingUrlAction } from "./actions";
import { audioTime, recordingPeaks } from "./recording-waveform";
import styles from "./recording-player.module.css";

export function RecordingPlayer({ callUuid, finishedAt }: { callUuid: string; finishedAt?: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<"listen" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      requestRef.current?.abort();
      audio?.pause();
      audio?.removeAttribute("src");
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || pending) return;
    if (playing) { audio.pause(); return; }
    setError(null);
    if (objectUrlRef.current) {
      try {
        if (audio.ended) audio.currentTime = 0;
        await audio.play();
      } catch { setError("No se pudo reproducir el audio. Puedes reintentar."); }
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setPending("listen");
    let context: AudioContext | null = null;
    try {
      // Resume during the user gesture. No audio is fetched on page load.
      context = new AudioContext();
      await context.resume();
      const response = await fetch(`/api/recordings/${encodeURIComponent(callUuid)}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("audio_unavailable");
      const blob = await response.blob();
      if (blob.size > 32 * 1024 * 1024) throw new Error("audio_too_large");
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      if (controller.signal.aborted) return;
      setPeaks(recordingPeaks(buffer));
      setDuration(buffer.duration);
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      audio.src = objectUrl;
      await audio.play();
    } catch {
      if (!controller.signal.aborted) setError("No se pudo cargar la grabación. Puedes reintentar.");
    } finally {
      await context?.close().catch(() => undefined);
      if (!controller.signal.aborted) setPending(null);
    }
  }

  async function download() {
    setPending("download");
    setError(null);
    try {
      const { url } = await getRecordingUrlAction(callUuid, true);
      window.location.assign(url);
    } catch { setError("No se pudo descargar la grabación. Puedes reintentar."); }
    finally { setPending(null); }
  }

  const endedDate = finishedAt ? new Date(finishedAt) : null;
  const endTime = endedDate && Number.isFinite(endedDate.getTime())
    ? endedDate.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;
  const progress = duration > 0 ? position / duration : 0;
  const bars = peaks ?? Array<number>(48).fill(0.06);

  return (
    <section className={styles.message} aria-label="Grabación de llamada finalizada" aria-busy={pending !== null}>
      <div className={styles.heading}>
        <span className={styles.callIcon}><PhoneOffIcon size={19} aria-hidden="true" /></span>
        <div><strong>Llamada finalizada</strong>{endTime ? <time dateTime={finishedAt ?? undefined}>a las {endTime}</time> : <span>Grabación disponible</span>}</div>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.iconButton} onClick={() => void togglePlayback()} disabled={pending !== null} aria-label={pending === "listen" ? "Cargando grabación" : playing ? "Pausar grabación" : "Reproducir grabación"}>
          {pending === "listen" ? <Loader2Icon className={styles.spinner} size={23} aria-hidden="true" /> : playing ? <PauseIcon size={23} fill="currentColor" aria-hidden="true" /> : <PlayIcon size={23} fill="currentColor" aria-hidden="true" />}
        </button>
        <div className={styles.track}>
          <div className={styles.waveform}>
            <svg viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
              {bars.map((peak, index) => <rect key={index} x={index * 5} y={22 - peak * 19} width="3" height={peak * 38} rx="1.5" className={peaks && index / bars.length < progress ? styles.played : styles.unplayed} />)}
            </svg>
            <input type="range" min="0" max={duration || 1} step="0.1" value={position} disabled={!peaks} aria-label="Posición de la grabación" aria-valuetext={`${audioTime(position)} de ${audioTime(duration)}`} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setPosition(value); }} />
          </div>
          <span className={styles.duration}>{peaks ? `${audioTime(position)} / ${audioTime(duration)}` : "Audio de la llamada"}</span>
        </div>
        <button type="button" className={styles.iconButton} onClick={() => void download()} disabled={pending !== null} aria-label="Descargar grabación WAV" title="Descargar WAV">
          {pending === "download" ? <Loader2Icon className={styles.spinner} size={21} aria-hidden="true" /> : <DownloadIcon size={21} aria-hidden="true" />}
        </button>
      </div>
      <audio ref={audioRef} preload="none" aria-label="Audio de la llamada" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setPosition(audioRef.current?.currentTime ?? 0)} onError={() => setError("No se pudo reproducir la grabación. Puedes reintentar.")} />
      {error && <div className={styles.error}><p role="alert">{error}</p><button type="button" onClick={() => void togglePlayback()} disabled={pending !== null}><RefreshCwIcon size={12} aria-hidden="true" />Reintentar</button></div>}
    </section>
  );
}
