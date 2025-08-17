import {
  useEffect,
  useState,
  useDebugValue,
  useLayoutEffect as useLayoutEffectReact,
} from "react";

type UseMediaQueryOptions = {
  initialState?: boolean;
  comparator?: (matches: boolean) => boolean;
  useLayoutEffect?: boolean;
};

const isSupported = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

const addMediaListener = (
  mediaQuery: MediaQueryList,
  handler: (event: MediaQueryListEvent) => void
) => {
  if ("addEventListener" in mediaQuery) {
    mediaQuery.addEventListener("change", handler);
  } else {
    mediaQuery.addListener(handler); // Legacy fallback
  }
};

const removeMediaListener = (
  mediaQuery: MediaQueryList,
  handler: (event: MediaQueryListEvent) => void
) => {
  if ("removeEventListener" in mediaQuery) {
    mediaQuery.removeEventListener("change", handler);
  } else {
    mediaQuery.removeListener(handler);
  }
};

export function useMediaQuery(
  query: string,
  options: UseMediaQueryOptions = {}
): boolean {
  const {
    initialState = false,
    comparator,
    useLayoutEffect = false,
  } = options;

  const [matches, setMatches] = useState(() => {
    if (!isSupported()) return initialState;
    const initial = window.matchMedia(query).matches;
    return comparator ? comparator(initial) : initial;
  });

  const effectHook = useLayoutEffect ? useLayoutEffectReact : useEffect;

  useDebugValue(`MediaQuery: ${query} → ${matches} (comparator: ${!!comparator})`);

  effectHook(() => {
    if (!isSupported()) return;

    let mediaQuery: MediaQueryList;

    try {
      mediaQuery = window.matchMedia(query);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[useMediaQuery] Invalid media query "${query}":`, error);
      }
      return;
    }

    const updateMatch = (event: MediaQueryListEvent) => {
      const newMatch = comparator ? comparator(event.matches) : event.matches;
      setMatches((prev) => (newMatch !== prev ? newMatch : prev));
    };

    const currentMatch = comparator ? comparator(mediaQuery.matches) : mediaQuery.matches;
    if (currentMatch !== matches) {
      setMatches(currentMatch);
    }

    addMediaListener(mediaQuery, updateMatch);
    return () => removeMediaListener(mediaQuery, updateMatch);
  }, [query, comparator, matches]); // added `matches` to dependency array for stability

  return matches;
}
