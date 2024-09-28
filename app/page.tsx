'use client'

import { useState } from 'react';
import { searchGoogle } from '@/app/actions/searchGoogle';

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    const data = await searchGoogle(query);
    setResult(data);
  };

  return (
    <div className="font-sans min-h-screen p-8">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-2xl font-bold">Google Search API</h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query"
            className="border border-gray-300 rounded px-4 py-2"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Search
          </button>
        </div>
        {result && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Search Results:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-w-full">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
