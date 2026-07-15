"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Textarea } from "@/shared/ui/text-area";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { CREATE_CATEGORY_LINKS } from "@/shared/lib/categories";
import {
  ArrowUpIcon,
  Paperclip,
  Music2,
  Library,
  Laugh,
} from "lucide-react";

const PENDING_PROMPT_KEY = "new:pending-prompt";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  stickman: <span className="font-bold text-base leading-none">◈</span>,
  brainrot: <span className="font-bold text-base leading-none">▶</span>,
  lofi: <Music2 className="w-4 h-4" />,
  "lofi-stock": <Library className="w-4 h-4" />,
  meme: <Laugh className="w-4 h-4" />,
};

const CATEGORIES = CREATE_CATEGORY_LINKS.map((c) => ({
  id: c.id,
  label: c.navLabel,
  description: c.description ?? "",
  image: c.image,
  icon: c.glyph ? (
    <span className="font-bold text-base leading-none">{c.glyph}</span>
  ) : c.icon ? (
    <c.icon className="w-4 h-4" />
  ) : (
    CATEGORY_ICONS[c.id] ?? null
  ),
}));

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface RuixenMoonChatProps {
  onCategorySelect?: (category: string) => void
}

export default function RuixenMoonChat({ onCategorySelect }: RuixenMoonChatProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const handleCategoryClick = (categoryId: string) => {
    if (message.trim()) {
      try {
        localStorage.setItem(PENDING_PROMPT_KEY, message.trim());
      } catch {}
    }
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      router.push(`/new?category=${categoryId}`);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto bg-background px-6 py-10">
      <div className="w-full max-w-5xl">
        <div className="mx-auto mt-10 w-full max-w-3xl">
          <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustHeight();
              }}
              placeholder="Type your request..."
              className={cn(
                "w-full px-4 py-3 resize-none border-none",
                "bg-transparent text-foreground text-sm",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground min-h-[48px]"
              )}
              style={{ overflow: "hidden" }}
            />

            <div className="flex items-center justify-between p-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-[var(--surface2)]"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Button
                disabled
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  "bg-[var(--surface2)] text-muted-foreground cursor-not-allowed"
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-semibold text-foreground">Templates</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <TemplateCard
                key={cat.id}
                icon={cat.icon}
                image={cat.image}
                label={cat.label}
                description={cat.description}
                onClick={() => handleCategoryClick(cat.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  icon: React.ReactNode;
  image?: string;
  label: string;
  description: string;
  onClick: () => void;
}

function TemplateCard({
  icon,
  image,
  label,
  description,
  onClick,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-stretch text-left transition-opacity focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-2xl"
      )}
    >
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface2)]",
          "transition-colors group-hover:border-foreground/20"
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={label}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-foreground">
            {icon}
          </span>
        )}
      </div>
      <span className="mt-3 text-sm font-medium text-foreground">{label}</span>
      <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {description}
      </span>
    </button>
  );
}
