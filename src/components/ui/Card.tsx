'use client';

import { forwardRef, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  variant?: 'default' | 'glass' | 'gradient';
  hover?: boolean;
  children?: ReactNode;
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', hover = true, children }, ref) => {
    const variants = {
      default: 'bg-white/95 border border-white/50',
      glass: 'glass',
      gradient: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200/50',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? { y: -5, scale: 1.01 } : undefined}
        transition={{ duration: 0.3 }}
        className={`rounded-2xl shadow-xl backdrop-blur-lg p-6 ${variants[variant]} ${className}`}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
