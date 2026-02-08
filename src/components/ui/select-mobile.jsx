import React, { useState, useEffect } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export function SelectMobile({
  value,
  onValueChange,
  children,
  placeholder,
  triggerClassName,
  contentClassName,
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>{children}</SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName || 'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'}
      >
        <span className="text-muted-foreground">{placeholder || 'Select...'}</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {React.Children.map(children, (child) =>
              React.cloneElement(child, {
                onSelect: (val) => {
                  onValueChange(val);
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

export { SelectItem, SelectValue };