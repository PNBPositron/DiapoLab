import { useState } from "react";
import { PresentationMode } from "./PresentationMode";
import { Play } from "lucide-react";

export function EditorHeader() {
  const [isPresenting, setIsPresenting] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-bold text-sm">DiapoLab</span>

        {/* Present Trigger Button */}
        <button
          onClick={() => setIsPresenting(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-xs hover:bg-sky-500 transition"
        >
          <Play className="size-3.5 fill-current" />
          Present
        </button>
      </header>

      {/* Renders nothing until isPresenting is true */}
      <PresentationMode 
        isOpen={isPresenting} 
        onExit={() => setIsPresenting(false)} 
      />
    </>
  );
}
