import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Carries the active value and a per-instance layoutId down to each trigger so
 * the highlighted pill can do a shared-layout animation between them — and so
 * two independent Tabs on the same page (header nav, dashboard filters) never
 * cross-animate into each other.
 */
const TabsActiveContext = React.createContext<{ value?: string; layoutId: string }>({
  value: undefined,
  layoutId: "tabs",
});

export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, ...props }, ref) => {
  const layoutId = React.useId();
  return (
    <TabsActiveContext.Provider value={{ value, layoutId }}>
      <TabsPrimitive.Root ref={ref} value={value} {...props} />
    </TabsActiveContext.Provider>
  );
});
Tabs.displayName = "Tabs";

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("glass-pill inline-flex items-center gap-1 p-1", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const { value: activeValue, layoutId } = React.useContext(TabsActiveContext);
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
        isActive ? "text-ink" : "text-muted hover:text-paper",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-focus/90 shadow-glass-sm backdrop-blur-sm"
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
