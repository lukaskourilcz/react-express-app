import {
  FIN_BODY, FIN_WAVE_CUT, FIN_WAVE_LINE,
  LOGO_FIN_PLACEMENT, LOGO_LETTERS, LOGO_LETTER_STROKE, LOGO_VIEW_BOX, LOGO_WAVE_STROKE, LOGO_WORDMARK_X,
} from '../components/brandGeometry';

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

  // The brand appears first here, so the card carries the full V9 logo, not
  // the name set in a system font.
  drawLogo(ctx, 120, 94, 44, accent);
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
  // or platform-dependent artwork. The fin is the kit's clean fin.
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
  // A 72px clean fin whose base (y=18 of its 24-unit box) sits on the line.
  ctx.save();
  ctx.translate(880, y - 18 * 3);
  ctx.scale(3, 3);
  ctx.fillStyle = accent;
  drawFinBody(ctx);
  ctx.restore();

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

// The kit's fin body, mirrored with translate(24 0) scale(-1 1) so the tip
// points left, in the current transform's 24-unit box.
function drawFinBody(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.transform(-1, 0, 0, 1, 24, 0);
  ctx.fill(new Path2D(FIN_BODY));
  ctx.restore();
}

/** The compact logo from brandGeometry.ts, `height` px tall with its top-left
 * corner at (x, y). Letters are stroked before they are filled, as the kit's
 * paint-order: stroke does. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, color: string) {
  const scale = height / LOGO_VIEW_BOX.height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-LOGO_VIEW_BOX.x, -LOGO_VIEW_BOX.y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.save();
  ctx.translate(LOGO_FIN_PLACEMENT.x, LOGO_FIN_PLACEMENT.y);
  ctx.scale(LOGO_FIN_PLACEMENT.scale, LOGO_FIN_PLACEMENT.scale);
  ctx.save();
  ctx.clip(new Path2D(FIN_WAVE_CUT));
  drawFinBody(ctx);
  ctx.restore();
  ctx.lineWidth = LOGO_WAVE_STROKE;
  ctx.stroke(new Path2D(FIN_WAVE_LINE));
  ctx.restore();

  ctx.translate(LOGO_WORDMARK_X, 0);
  ctx.lineWidth = LOGO_LETTER_STROKE;
  for (const { d, dx } of LOGO_LETTERS) {
    const letter = new Path2D(d);
    ctx.save();
    ctx.translate(dx, 0);
    ctx.stroke(letter);
    ctx.fill(letter);
    ctx.restore();
  }
  ctx.restore();
}
