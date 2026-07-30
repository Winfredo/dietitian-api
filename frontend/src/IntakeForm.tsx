import { useState, type FormEvent } from "react";

interface IntakeFormProps {
  onSubmit: (fullName: string, file: File) => void;
  disabled: boolean;
}

export function IntakeForm({ onSubmit, disabled }: IntakeFormProps) {
  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    onSubmit(fullName, file);
  }

  return (
    <form onSubmit={handleSubmit} className="intake-form">
      <label>
        Full name
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
      </label>
      <label>
        Medical history file (image, PDF, or CSV)
        <input
          type="file"
          accept="image/*,application/pdf,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </label>
      <button type="submit" disabled={disabled || !file}>
        {disabled ? "Processing..." : "Upload"}
      </button>
    </form>
  );
}
