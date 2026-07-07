import type * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mp-html': {
        content?: string;
        'preview-img'?: boolean;
        selectable?: boolean;
        'tag-style'?: { [key: string]: string };
        plugins?: string[];
        onLinkTap?: (e: { detail: { src: string } }) => void;
      };
    }
  }
}
