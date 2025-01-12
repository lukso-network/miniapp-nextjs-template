'use client';

import { GridProvider } from '@/components/GridProvider';
import { Search } from '@/components/Search';
import { Donate } from '@/components/Donate';
import { useGrid } from '@/components/GridProvider';
import { useState } from 'react';
function MainContent() {
  const { selectedAddress, setSelectedAddress, isSearching } = useGrid();
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  return (
    <>
      <div
        className={`${
          isSearching ? 'hidden' : 'block'
        }`}
      >
        <Donate selectedAddress={selectedAddress} selectedUsername={selectedUsername} />
      </div>

      <div
        className={`${
          !isSearching ? 'hidden' : 'block'
        }`}
      >
        <Search onSelectAddress={setSelectedAddress} onSelectUsername={setSelectedUsername} />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <GridProvider>
      <MainContent />
    </GridProvider>
  );
}
