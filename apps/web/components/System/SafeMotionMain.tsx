'use client';

import { motion, type MotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import PropTypes from 'prop-types';

const EASE = [0.4, 0, 0.2, 1];

type SafeMotionMainProps = {
  children: ReactNode;
  motionKey?: string;
  duration?: number;
} & MotionProps;

export default function SafeMotionMain({
  children,
  motionKey,
  duration = 0.3,
  style,
  ...motionProps
}: SafeMotionMainProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <motion.main
      key={motionKey}
      id="main-content"
      aria-live="polite"
      aria-atomic="true"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: -20 } : undefined}
      transition={{
        ...(shouldAnimate && { ease: EASE, type: 'tween' }),
        duration: shouldAnimate ? duration : 0,
      }}
      style={{
        willChange: shouldAnimate ? 'opacity, transform' : 'auto',
        transformStyle: 'preserve-3d',
        ...(style as React.CSSProperties),
      }}
      {...motionProps}
    >
      {children}
    </motion.main>
  );
}

SafeMotionMain.displayName = 'SafeMotionMain';

SafeMotionMain.propTypes = {
  children: PropTypes.node.isRequired,
  motionKey: PropTypes.string,
  duration: PropTypes.number,
};
