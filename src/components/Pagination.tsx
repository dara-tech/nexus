'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  siblingCount?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  siblingCount = 1,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  // Calculate range with ellipsis
  const generatePageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
    const totalBlocks = totalNumbers + 2; // + 2 for ellipsis blocks

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const pages = generatePageNumbers();

  return (
    <nav
      className={`pagination-container ${className}`}
      aria-label="Pagination Navigation"
    >
      {/* Pagination Controls */}
      <div className="pagination-controls">
        {/* Previous Button */}
        <button
          id="pagination-prev-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn pagination-nav-btn"
          aria-label="Previous Page"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
          <span className="desktop-only">Prev</span>
        </button>

        {/* Page Number Buttons */}
        <div className="pagination-pages">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="pagination-dots">
                  …
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                id={`pagination-page-${pageNum}`}
                onClick={() => onPageChange(pageNum)}
                className={`pagination-btn pagination-num-btn ${isActive ? 'active' : ''}`}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          id="pagination-next-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn pagination-nav-btn"
          aria-label="Next Page"
          title="Next Page"
        >
          <span className="desktop-only">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};
