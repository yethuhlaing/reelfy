"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";
import { motion, type HTMLMotionProps, type Variant } from "motion/react";

export type TimelineVariants = {
  visible: (index: number) => Variant;
  hidden: Variant;
};

type TimelineContentProps<T extends ElementType> = {
  children: ReactNode;
  animationNum: number;
  timelineRef: RefObject<HTMLElement | null>;
  customVariants: TimelineVariants;
  className?: string;
  as?: T;
} & Omit<HTMLMotionProps<"div">, "children" | "ref">;

export function TimelineContent<T extends ElementType = "div">({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className,
  as,
  ...motionProps
}: TimelineContentProps<T>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = timelineRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [timelineRef]);

  const Component = useMemo(() => motion.create(as ?? "div"), [as]);

  return (
    <Component
      className={className}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      custom={animationNum}
      variants={{
        hidden: customVariants.hidden,
        visible: customVariants.visible,
      }}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
