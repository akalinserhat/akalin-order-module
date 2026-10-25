import { useEffect } from 'react';
import { useHeader } from '@akalin/ui';

export const useHeaderCollapsible = (enabled: boolean = true, defaultCollapsed?: boolean) => {
  const { setHeaderCollapsible, setIsHeaderCollapsed } = (useHeader() || {}) as any;

  useEffect(() => {
    if (typeof setHeaderCollapsible === 'function') {
      setHeaderCollapsible(enabled);
    }
    if (enabled && defaultCollapsed !== undefined && typeof setIsHeaderCollapsed === 'function') {
      setIsHeaderCollapsed(defaultCollapsed);
    }

    return () => {
      if (typeof setHeaderCollapsible === 'function') {
        setHeaderCollapsible(true);
      }
    };
  }, [enabled, defaultCollapsed, setHeaderCollapsible, setIsHeaderCollapsed]);
};

export default useHeaderCollapsible;
