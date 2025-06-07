import React from 'react';
import { motion } from 'framer-motion';
import { HealthRatio } from '../../types';
import { AlertCircle } from 'lucide-react';

interface HealthRatioGaugeProps {
  healthRatio: HealthRatio;
  size?: 'sm' | 'md' | 'lg';
}

const HealthRatioGauge: React.FC<HealthRatioGaugeProps> = ({ 
  healthRatio, 
  size = 'md'
}) => {
  // Calculate angle based on health ratio (0.5 to 2.5 maps to 0 to 180 degrees)
  const angle = Math.min(180, Math.max(0, (healthRatio.value - 0.5) * 90));
  
  // Define size variables
  const dimensions = {
    sm: { width: 100, height: 50, fontSize: 'text-xs', iconSize: 12, strokeWidth: 5 },
    md: { width: 160, height: 80, fontSize: 'text-sm', iconSize: 16, strokeWidth: 8 },
    lg: { width: 200, height: 100, fontSize: 'text-base', iconSize: 20, strokeWidth: 10 },
  };
  
  const { width, height, fontSize, iconSize, strokeWidth } = dimensions[size];
  
  // Status colors
  const statusColors = {
    healthy: '#16A325', // success-500
    warning: '#FFB100', // warning-500
    danger: '#FA0000', // error-500
  };
  
  const statusColor = statusColors[healthRatio.status];
  
  // Status messages
  const statusMessages = {
    healthy: 'Safe',
    warning: 'Warning',
    danger: 'Liquidation Risk',
  };

  return (
    <div className="flex flex-col items-center">
      <div style={{ width, height: height + 20 }} className="relative">
        {/* Background track */}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute">
          <path
            d={`M ${width / 2} ${height} A ${width / 2} ${height} 0 0 1 ${width} ${height}`}
            fill="none"
            stroke="#E5E7EB" // neutral-200
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Colored gauge */}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: angle / 180 }}
            transition={{ duration: 1, ease: "easeOut" }}
            d={`M ${width / 2} ${height} A ${width / 2} ${height} 0 0 1 ${width} ${height}`}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Indicator needle */}
        <motion.div 
          initial={{ rotate: 0 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ 
            width: strokeWidth, 
            height: height / 2 + strokeWidth / 2,
            transformOrigin: 'bottom center',
            left: `calc(50% - ${strokeWidth / 2}px)`,
            bottom: 0
          }}
          className="absolute bg-neutral-700 rounded-t-full"
        />
        
        {/* Value */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-8">
          <div className={`text-center ${fontSize}`}>
            <div className="font-semibold">{healthRatio.value.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      {/* Status label */}
      <div className={`mt-2 flex items-center space-x-1 ${fontSize} font-medium`} style={{ color: statusColor }}>
        {healthRatio.status === 'danger' && <AlertCircle size={iconSize} />}
        <span>{statusMessages[healthRatio.status]}</span>
      </div>
    </div>
  );
};

export default HealthRatioGauge;