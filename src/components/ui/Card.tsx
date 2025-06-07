import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

interface CardProps {
  children: ReactNode;
  className?: string;
  glassEffect?: boolean;
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  glassEffect = false,
  hoverEffect = false 
}) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "rounded-xl overflow-hidden border",
        glassEffect 
          ? "backdrop-blur-sm bg-white/70 dark:bg-neutral-800/70 border-white/20 dark:border-neutral-700/20 shadow-glass" 
          : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-card",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export default Card;