export interface ResultShareCardInput {
  brand: string;
  label: string;
  score: number;
  total: number;
  percentage: number;
  date: string;
  accent: string;
}

/** Browser-only, privacy-safe result artwork. It deliberately includes no
 * account identity, room code, question text, answers, or session data. */
export async function createResultShareFile(input: ResultShareCardInput): Promise<File | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const accent = /^#[0-9a-f]{6}$/i.test(input.accent.trim()) ? input.accent.trim() : '#2d7a2d';
  const background = ctx.createLinearGradient(0, 0, 1200, 630);
  background.addColorStop(0, '#f8faf9');
  background.addColorStop(1, '#edf6f0');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#dce7e0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(64, 54, 1072, 522, 44);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '800 38px system-ui, -apple-system, sans-serif';
  ctx.fillText(input.brand, 120, 135);
  ctx.fillStyle = '#53666f';
  ctx.font = '600 27px system-ui, -apple-system, sans-serif';
  ctx.fillText(input.label, 120, 188);

  ctx.fillStyle = '#17272e';
  ctx.font = '800 118px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${input.score} / ${input.total}`, 120, 352);
  ctx.fillStyle = accent;
  ctx.font = '800 42px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${input.percentage}%`, 124, 416);
  ctx.fillStyle = '#6c7d84';
  ctx.font = '500 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(input.date, 120, 510);

  // The shared waterline/fin motif is drawn as vectors, with no network asset
  // or platform-dependent artwork.
  const y = 454;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(650, y);
  for (let x = 650; x <= 1060; x += 40) {
    ctx.quadraticCurveTo(x + 10, y - 11, x + 20, y);
    ctx.quadraticCurveTo(x + 30, y + 11, x + 40, y);
  }
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(890, y - 2);
  ctx.quadraticCurveTo(920, y - 86, 952, y - 5);
  ctx.quadraticCurveTo(925, y - 28, 890, y - 2);
  ctx.fill();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!blob) return null;
  return new File([blob], `${input.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-result.png`, {
    type: 'image/png',
  });
}

export function downloadShareFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
