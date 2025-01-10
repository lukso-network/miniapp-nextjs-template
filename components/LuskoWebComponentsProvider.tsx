// components/LuksoProvider.tsx
'use client';

import React, { useEffect } from 'react';

export default function LuksoWebComponentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Dynamically import the library on the client side
    import('@lukso/web-components');
  }, []);

  return <>{children}</>;
}
