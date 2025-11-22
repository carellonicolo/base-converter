import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  const baseStyles = 'glass-card p-6';
  const hoverStyles = hover ? 'cursor-pointer' : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  const classes = `${baseStyles} ${hoverStyles} ${clickableStyles} ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
