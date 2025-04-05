'use client';

import React from 'react';

export function Spinner() {
  return (
    <div className="flex justify-center items-center" role="status">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
    </div>
  );
} 