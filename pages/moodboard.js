// pages/moodboard.js
// Serve moodboard.html as a proper Next.js page
// This bypasses vercel.json rewrites entirely - /moodboard is a real Next.js route

import fs from 'fs';
import path from 'path';

export async function getServerSideProps({ res }) {
  const htmlPath = path.join(process.cwd(), 'public', 'moodboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write(html);
  res.end();
  
  return { props: {} };
}

export default function Moodboard() {
  return null;
}
