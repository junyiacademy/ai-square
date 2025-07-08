import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  animate?: boolean
}

export function LoadingSkeleton({ 
  className = '', 
  animate = true 
}: LoadingSkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 rounded
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  )
}

interface LoadingCardProps {
  showImage?: boolean
  lines?: number
}

export function LoadingCard({ showImage = true, lines = 3 }: LoadingCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {showImage && (
        <LoadingSkeleton className="h-48 w-full mb-4" />
      )}
      <LoadingSkeleton className="h-6 w-3/4 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-1/2' : 'w-full'} mb-2`} 
        />
      ))}
    </div>
  )
}

export function LoadingAccordion() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i}
          className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LoadingSkeleton className="h-8 w-8 rounded mr-3" />
              <LoadingSkeleton className="h-6 w-48" />
            </div>
            <LoadingSkeleton className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  )
}