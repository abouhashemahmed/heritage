import { useLayoutEffect } from "react";

let lockCount = 0;

let originalBodyCSS: {
  overflow: string;
  paddingRight: string;
  touchAction?: string;
} | null = null;

export default function useLockBodyScroll(lock: boolean = true) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    let appliedThisLock = false;
    const rootElement = document.documentElement as HTMLElement;

    if (lock) {
      if (lockCount === 0) {
        const scrollbarWidth = window.innerWidth - rootElement.clientWidth;
        const computedStyle = window.getComputedStyle(rootElement);

        originalBodyCSS = {
          overflow: computedStyle.overflow,
          paddingRight: computedStyle.getPropertyValue("padding-right"),
          touchAction: computedStyle.touchAction,
        };

        rootElement.style.overflow = "hidden";
        rootElement.style.touchAction = "none";

        const currentPadding = parseFloat(computedStyle.getPropertyValue("padding-right")) || 0;

        if (scrollbarWidth > 0) {
          rootElement.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
        }

        if (process.env.NODE_ENV === "development") {
          if (!computedStyle.paddingRight.endsWith("px")) {
            console.warn("[Scroll Lock] Non-pixel padding may cause issues.");
          }
        }
      }

      lockCount++;
      appliedThisLock = true;
    }

    return () => {
      if (appliedThisLock) {
        lockCount--;

        if (lockCount === 0 && originalBodyCSS) {
          rootElement.style.overflow = originalBodyCSS.overflow;
          rootElement.style.paddingRight = originalBodyCSS.paddingRight;
          rootElement.style.touchAction = originalBodyCSS.touchAction || "";
          originalBodyCSS = null;
        }
      }
    };
  }, [lock]);
}
