// types/next-link.d.ts
import type { LinkProps as OriginalLinkProps } from 'next/dist/client/link';
import type { ReactNode, AnchorHTMLAttributes } from 'react';

declare module 'next/link' {
  export interface LinkProps
    extends Omit<OriginalLinkProps, 'legacyBehavior' | 'passHref' | 'children'>,
      AnchorHTMLAttributes<HTMLAnchorElement> {
    children: ReactNode;
  }
}
