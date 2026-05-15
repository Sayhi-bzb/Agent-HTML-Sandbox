import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const revalidate = false;

export async function GET() {
  const imagePath = path.resolve(process.cwd(), '..', 'assets', 'blocks.png');
  const image = await readFile(imagePath);

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
