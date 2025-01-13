'use client';

import { UpProvider } from '@/components/upProvider';
import { Donate } from '@/components/Donate';
import { ProfileSearch } from '@/components/ProfileSearch';
import { useUpProvider } from '@/components/upProvider';

function MainContent() {
  const { selectedAddress, setSelectedAddress, isSearching } = useUpProvider();
  return (
    <>
      <div
        className={`${
          isSearching ? 'hidden' : 'block'
        }`}
      >
        <Donate selectedAddress={selectedAddress} />
      </div>

      <div
        className={`${
          !isSearching ? 'hidden' : 'block'
        }`}
      >
        <ProfileSearch onSelectAddress={setSelectedAddress}  />
      </div>
    </>
  );
}

export default function Home() {
  return (
    <UpProvider>
      <MainContent />
    </UpProvider>
  );
}
