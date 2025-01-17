import { LuksoButton } from '@lukso/web-components/dist/components/lukso-button';
import { LuksoCard } from '@lukso/web-components/dist/components/lukso-card';
import { LuksoInput } from '@lukso/web-components/dist/components/lukso-input';
import { LuksoUsername } from '@lukso/web-components/dist/components/lukso-username';
import { LuksoIcon } from '@lukso/web-components/dist/components/lukso-icon';
import { LuksoTooltip } from '@lukso/web-components/dist/components/lukso-tooltip';
import React from 'react';

/**
 * Generic type for LUKSO Web Components that enables React compatibility.
 * 
 * @template T - The type of the web component's properties
 * @description
 * This type allows LUKSO web components to be used within React applications by:
 * 1. Merging standard HTML element props with component-specific props
 * 2. Supporting React children and class name props
 * 3. Making all component props optional to maintain flexibility
 * 
 * @example
 * // Usage in JSX
 * <lukso-button variant="primary">Click me</lukso-button>
 */
type WebComponent<T> =
  | (React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
      Partial<T>)
  | { children?: React.ReactNode; class?: string };

/**
 * Extends React's JSX namespace to include LUKSO web components.
 * This declaration enables TypeScript support for LUKSO components in JSX/TSX files.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lukso-card': WebComponent<LuksoCard>;
      'lukso-username': WebComponent<LuksoUsername>;
      'lukso-button': WebComponent<LuksoButton>;
      'lukso-input': WebComponent<LuksoInput>;
      'lukso-icon': WebComponent<LuksoIcon>;
      'lukso-tooltip': WebComponent<LuksoTooltip>;
    }
  }
}
