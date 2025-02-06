import { useRouter } from 'next/navigation';

const tools = [
  { id: 'mmk-creator', name: 'MMK Creator', description: 'Generate MMK programs for tool correction' },
  { id: 'l300-probe', name: 'L300 Probe Program', description: 'Generate L300 probe programs' },
  { id: 't-list-creator', name: 'T_List Creator', description: 'Generate T_List programs' },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center p-10">
      <h1 className="text-4xl font-bold mb-8">CNC Tool Generator</h1>
      <p className="mb-6 text-lg text-gray-700">Select a tool to generate a program:</p>
      <div className="w-full max-w-lg space-y-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => router.push(`/tool/${tool.id}`)}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600 transition"
          >
            {tool.name}
          </button>
        ))}
      </div>
    </div>
  );
}
