import { LuksoButton } from '@lukso/web-components/dist/components/lukso-button';
import { LuksoCard } from '@lukso/web-components/dist/components/lukso-card';
import { LuksoCheckbox } from '@lukso/web-components/dist/components/lukso-checkbox';
import { LuksoFooter } from '@lukso/web-components/dist/components/lukso-footer';
import { LuksoIcon } from '@lukso/web-components/dist/components/lukso-icon';
import { LuksoInput } from '@lukso/web-components/dist/components/lukso-input';
import { LuksoModal } from '@lukso/web-components/dist/components/lukso-modal';
import { LuksoNavbar } from '@lukso/web-components/dist/components/lukso-navbar';
import { LuksoProfile } from '@lukso/web-components/dist/components/lukso-profile';
import { LuksoProgress } from '@lukso/web-components/dist/components/lukso-progress';
import { LuksoSanitize } from '@lukso/web-components/dist/components/lukso-sanitize';
import { LuksoSearch } from '@lukso/web-components/dist/components/lukso-search';
import { LuksoSelect } from '@lukso/web-components/dist/components/lukso-select';
import { LuksoShare } from '@lukso/web-components/dist/components/lukso-share';
import { LuksoTag } from '@lukso/web-components/dist/components/lukso-tag';
import { LuksoTerms } from '@lukso/web-components/dist/components/lukso-terms';
import { LuksoTooltip } from '@lukso/web-components/dist/components/lukso-tooltip';
import { LuksoUsername } from '@lukso/web-components/dist/components/lukso-username';
import { LuksoWizard } from '@lukso/web-components/dist/components/lukso-wizard';
import React from 'react';

type WebComponent<T> =
  | (React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
      Partial<T>)
  | { children?: React.ReactNode; class?: string };

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      'lukso-navbar': WebComponent<LuksoNavbar>;
      'lukso-wizard': WebComponent<LuksoWizard> | { steps: string };
      'lukso-card': WebComponent<LuksoCard>;
      'lukso-checkbox': WebComponent<LuksoCheckbox>;
      'lukso-footer': WebComponent<LuksoFooter> | { providers: string };
      'lukso-username': WebComponent<LuksoUsername>;
      'lukso-button': WebComponent<LuksoButton>;
      'lukso-sanitize': WebComponent<LuksoSanitize>;
      'lukso-icon': WebComponent<LuksoIcon>;
      'lukso-modal': WebComponent<LuksoModal>;
      'lukso-terms': WebComponent<LuksoTerms>;
      'lukso-input': WebComponent<LuksoInput>;
      'lukso-profile': WebComponent<LuksoProfile>;
      'lukso-progress': WebComponent<LuksoProgress>;
      'lukso-share': WebComponent<LuksoShare>;
      'lukso-tag': WebComponent<LuksoTag>;
      'lukso-select': WebComponent<LuksoSelect>;
      'lukso-tooltip': WebComponent<LuksoTooltip>;
      'lukso-search': WebComponent<LuksoSearch>;
    }
  }
}
