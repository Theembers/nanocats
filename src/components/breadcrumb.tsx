"use client";

import Link from "next/link";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <Fragment key={index}>
              {/* 分隔符 */}
              {!isFirst && (
                <li className="breadcrumb-separator" aria-hidden="true">
                  <ChevronIcon className="w-3.5 h-3.5" />
                </li>
              )}

              {/* 面包屑项 */}
              <li className={`breadcrumb-item ${isLast ? "breadcrumb-item-active" : ""}`}>
                {item.href && !isLast ? (
                  <Link href={item.href} className="breadcrumb-link">
                    {isFirst && <HomeIcon className="w-3.5 h-3.5 mr-1.5" />}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="breadcrumb-current">
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
