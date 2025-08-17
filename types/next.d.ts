// types/next.d.ts
import type { LinkProps as NextLinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

declare module 'next/link' {
  export interface LinkProps
    extends Omit<NextLinkProps, 'legacyBehavior' | 'passHref' | 'children'>,
      AnchorHTMLAttributes<HTMLAnchorElement> {
    /** Required children for App Router compatibility */
    children: ReactNode;
    /** @deprecated Only needed for Pages Router compatibility */
    legacyBehavior?: never;
    /** @deprecated Not needed in App Router */
    passHref?: never;
  }
}
