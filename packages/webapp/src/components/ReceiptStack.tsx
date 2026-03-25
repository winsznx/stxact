'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, FileCheck, AlertCircle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface Receipt {
  title: string;
  type: string;
  status: string;
  icon: React.ReactNode;
  description: string;
  date: string;
  hash: string;
}

const receipts: Receipt[] = [
  {
    title: 'Standard Receipt',
    type: 'Sync Delivery',
    status: 'Completed',
    icon: <CheckCircle2 className="h-6 w-6" />,
    description: 'Immediate delivery proof included',
    date: '2 min ago',
    hash: '0x32...89a',
  },
  {
    title: 'Provisional Receipt',
    type: 'Async Pending',
    status: 'Processing',
    icon: <Clock className="h-6 w-6" />,
    description: 'Job queued, delivery commitment pending',
    date: '15 min ago',
    hash: '0x1c...4f2',
  },
  {
    title: 'Final Receipt',
    type: 'Async Complete',
    status: 'Verified',
    icon: <FileCheck className="h-6 w-6" />,
    description: 'Delivery commitment set, revision incremented',
    date: '1 hour ago',
    hash: '0x9a...b3d',
  },
  {
    title: 'Dispute Record',
    type: 'Disputed',
    status: 'Open',
    icon: <AlertCircle className="h-6 w-6" />,
    description: 'Dispute filed, resolution in progress',
    date: '3 hours ago',
    hash: '0x7e...2c1',
  },
  {
    title: 'Resolution Record',
    type: 'Refunded',
    status: 'Resolved',
    icon: <RefreshCw className="h-6 w-6" />,
    description: 'Refund authorization executed on-chain',
    date: '1 day ago',
    hash: '0x5b...9e4',
  },
];

/**
 * Executes logic associated with receipt stack.
 */
export function ReceiptStack() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % receipts.length);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + receipts.length) % receipts.length);
  };

  return (
    <div className="relative mx-auto w-full max-w-md h-[500px] flex flex-col items-center justify-center">
      <div className="relative w-full h-[400px]">
        <AnimatePresence mode='popLayout'>
          {receipts.map((receipt, index) => {
            // Calculate distance from active index
            // We want to show a stack: active is top, others are behind
            const isActive = index === activeIndex;
            const diff = (index - activeIndex + receipts.length) % receipts.length;

            // Only show a few cards in the stack visually
            if (diff > 2 && !isActive) return null;

            return (
              <motion.div
                key={receipt.title}
                layout
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{
                  scale: isActive ? 1 : 1 - diff * 0.05,
                  y: isActive ? 0 : diff * 15,
                  opacity: isActive ? 1 : 1 - diff * 0.3,
                  zIndex: receipts.length - diff,
                  rotateX: isActive ? 0 : -5 * diff,
                }}
                exit={{ scale: 1.1, opacity: 0, y: -50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 cursor-pointer"
                onClick={nextCard}
                style={{ transformPerspective: 1000 }}
              >
                <div className="glass-strong h-full rounded-none border-2 border p-8 shadow-2xl backdrop-blur-xl transition-colors hover:border-accent/50">
                  {/* Receipt content */}
                  <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground">
                        {receipt.icon}
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-bold">{receipt.title}</h3>
                        <p className="text-sm text-foreground-muted">{receipt.type}</p>
                      </div>
                    </div>
                    <div className={`rounded-none border px-3 py-1 text-xs font-semibold ${receipt.status === 'Completed' ? 'border-success text-success' :
                        receipt.status === 'Processing' ? 'border-warning text-warning' :
                          'border-foreground text-foreground'
                      }`}>
                      {receipt.status}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border pb-3">
                      <p className="text-sm text-foreground-muted">{receipt.description}</p>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-foreground-subtle">Receipt ID</span>
                        <span className="font-semibold">{receipt.hash}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-subtle">Timestamp</span>
                        <span className="font-semibold">{receipt.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between border-t border pt-4">
                    <span className="text-xs text-foreground-subtle">Click to flip stack</span>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="mt-8 flex gap-4">
        <button onClick={prevCard} className="p-2 rounded-full hover:bg-background-raised transition-colors" aria-label="Previous">
          <ChevronUp className="w-5 h-5 text-foreground-muted" />
        </button>
        <div className="flex gap-2 items-center">
          {receipts.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${i === activeIndex ? 'w-4 bg-accent' : 'bg-foreground-subtle'}`}
            />
          ))}
        </div>
        <button onClick={nextCard} className="p-2 rounded-full hover:bg-background-raised transition-colors" aria-label="Next">
          <ChevronDown className="w-5 h-5 text-foreground-muted" />
        </button>
      </div>
    </div>
  );
}
