export function SpeechPage({ speech }: { speech: string }) {
  return (
    <div className="speech-window" role="status">
      {speech}
    </div>
  );
}
