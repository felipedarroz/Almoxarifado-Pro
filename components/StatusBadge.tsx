import React from 'react';
import { DeliveryStatus } from '../types';

interface StatusBadgeProps {
  status: DeliveryStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getColors = (s: DeliveryStatus) => {
    switch (s) {
      case DeliveryStatus.DELIVERED:
        return 'bg-green-100 text-green-800 border-green-200';
      case DeliveryStatus.NOT_RETRIEVED:
        return 'bg-red-100 text-red-800 border-red-200';
      case DeliveryStatus.PARTIAL_RETURN:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case DeliveryStatus.FULL_RETURN:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColors(status)}`}>
      {status}
    </span>
  );
};