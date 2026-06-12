// pages/index.js
// Next.js membutuhkan minimal satu page.
// Ini hanya redirect ke /planner.html (file HTML murni di public/)
// sehingga <script> tag berjalan normal — bukan di dalam React.

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/planner.html',
      permanent: false,
    },
  };
}

export default function Index() {
  return null;
}
