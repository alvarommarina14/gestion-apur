import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

export function DropdownMenuMobile({
  trigger,
  children,
  triggerClassName,
  contentClassName,
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <DropdownMenu {...props}>
        <DropdownMenuTrigger className={triggerClassName}>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent className={contentClassName}>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {React.Children.map(children, (child) =>
              React.cloneElement(child, {
                onClick: () => {
                  child.props.onClick?.();
                  setOpen(false);
                },
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export { DropdownMenuItem };