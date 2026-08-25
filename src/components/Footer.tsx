import React, { useState } from "react";
import { CreditModal } from "./CreditModal";

export const Footer: React.FC = () => {
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  return (
    <footer className="mt-12 py-6 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
      <div>
        © 2026 Designed & Developed by{" "}
        <button
          onClick={() => setIsCreditModalOpen(true)}
          className="underline underline-offset-2 hover:text-slate-700 transition-colors"
        >
          두리쌤
        </button>
        . All rights reserved.
      </div>
      <CreditModal isOpen={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} />
    </footer>
  );
};
