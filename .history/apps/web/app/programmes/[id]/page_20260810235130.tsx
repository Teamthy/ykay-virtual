type Programme = {
  id: string;
  title: string;
  curriculum: string;
  level: string;
  subject: string;
  format: string;
  summary: string;
  price: number;
};

async function getProgramme(id: string): Promise<Programme> {
  const response = await fetch(`http://localhost:8080/api/v1/programmes/${id}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load programme');
  }
  return response.json();
}

export default async function ProgrammeDetailPage({ params }: { params: { id: string } }) {
  const programme = await getProgramme(params.id);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 760 }}>
      <h1>{programme.title}</h1>
      <p>{programme.summary}</p>
      <p><strong>Curriculum:</strong> {programme.curriculum}</p>
      <p><strong>Level:</strong> {programme.level}</p>
      <p><strong>Subject:</strong> {programme.subject}</p>
      <p><strong>Format:</strong> {programme.format}</p>
      <p><strong>Price:</strong> ₦{programme.price.toLocaleString()}</p>
    </main>
  );
}
