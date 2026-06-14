"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/shared/ui/text-area";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  ArrowUpIcon,
  Paperclip,
  Music2,
  Library,
} from "lucide-react";

const PENDING_PROMPT_KEY = "new:pending-prompt";

const CATEGORIES = [
  {
    id: "stickman",
    label: "Stickman",
    icon: <span className="font-bold text-base leading-none">◈</span>,
  },
  {
    id: "lofi",
    label: "Lofi",
    icon: <Music2 className="w-4 h-4" />,
  },
  {
    id: "lofi-stock",
    label: "Lofi Stock",
    icon: <Library className="w-4 h-4" />,
  },
];

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
    <div className="relative flex min-h-0 w-full flex-1 flex-col items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/ai-chat.png')" }}
      />
      <div className="relative z-10 flex flex-1 w-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-foreground drop-shadow-sm">
            Ruixen AI
          </h1>
          <p className="mt-2 text-muted-foreground">
            Build something amazing — just start typing below.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-3xl mb-[20vh]">
        <div className="relative bg-[var(--surface)] backdrop-blur-md rounded-xl border border-[var(--border)]">
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

        <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
          {CATEGORIES.map((cat) => (
            <CategoryButton
              key={cat.id}
              icon={cat.icon}
              label={cat.label}
              onClick={() => handleCategoryClick(cat.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CategoryButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function CategoryButton({ icon, label, onClick }: CategoryButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:text-foreground hover:bg-[var(--surface2)]"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}
