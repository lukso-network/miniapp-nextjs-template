import { LuksoButton } from '@lukso/web-components/dist/components/lukso-button';
import { LuksoCard } from '@lukso/web-components/dist/components/lukso-card';
import { LuksoInput } from '@lukso/web-components/dist/components/lukso-input';
import { LuksoUsername } from '@lukso/web-components/dist/components/lukso-username';
import React from 'react';

type WebComponent<T> =
  | (React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
      Partial<T>)
  | { children?: React.ReactNode; class?: string };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lukso-card': WebComponent<LuksoCard>;
      'lukso-username': WebComponent<LuksoUsername>;
      'lukso-button': WebComponent<LuksoButton>;
      'lukso-input': WebComponent<LuksoInput>;
    }
  }
}
