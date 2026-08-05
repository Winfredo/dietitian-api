import { useId, useRef, useState, type DragEvent, type FormEvent } from "react";

interface IntakeFormProps {
  onSubmit: (fullName: string, file: File) => void;
  disabled: boolean;
  stage: "idle" | "uploading" | "processing" | "analyzed" | "failed" | "error";
}

const ACCEPTED_TYPES = "image/*,application/pdf,text/csv";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file: File): string {
  if (file.type === "application/pdf") return "📄";
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "text/csv") return "📊";
  return "📎";
}

export function IntakeForm({ onSubmit, disabled, stage }: IntakeFormProps) {
  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputId = useId();
  const nameInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    onSubmit(fullName, file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  const isUploading = stage === "uploading";
  const isProcessing = stage === "processing";

  let buttonLabel = "Get my nutrition plan";
  if (isUploading) buttonLabel = "Uploading…";
  else if (isProcessing) buttonLabel = "Analyzing…";

  return (
    <form onSubmit={handleSubmit} className="intake-form">
      <div className="field">
        <label htmlFor={nameInputId}>Full name</label>
        <input
          id={nameInputId}
          type="text"
          placeholder="Jordan Rivera"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="field">
        <label htmlFor={fileInputId}>Medical history</label>
        <div
          className={`dropzone${isDragging ? " dragging" : ""}${file ? " has-file" : ""}${
            disabled ? " disabled" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={disabled}
            required
            hidden
          />
          {file ? (
            <div className="dropzone-file">
              <span className="dropzone-file-icon" aria-hidden="true">
                {fileIcon(file)}
              </span>
              <div className="dropzone-file-meta">
                <span className="dropzone-file-name">{file.name}</span>
                <span className="dropzone-file-size">{formatFileSize(file.size)}</span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="dropzone-clear"
                  aria-label="Remove file"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div className="dropzone-empty">
              <span className="dropzone-icon" aria-hidden="true">
                ⬆️
              </span>
              <p>
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="dropzone-hint">Image, PDF, or CSV</p>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={disabled || !file}>
        {(isUploading || isProcessing) && <span className="btn-spinner" aria-hidden="true" />}
        {buttonLabel}
      </button>
    </form>
  );
}
