/**
 * SuggestedQuestions Component - Quick action buttons for common questions
 */

'use client';

import type { SuggestedQuestion } from '@/types/chat';

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({
  questions,
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  // Group questions by category
  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) {
      acc[q.category] = [];
    }
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, SuggestedQuestion[]>);

  const categoryLabels: Record<string, string> = {
    documents: 'מסמכים',
    fields: 'שדות',
    validation: 'אימות',
    report: 'דוח',
    general: 'כללי',
  };

  const categoryIcons: Record<string, JSX.Element> = {
    documents: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    fields: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    validation: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    report: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    general: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="px-4 pb-4">
      <p className="text-xs text-gray-500 mb-2">שאלות מוצעות:</p>
      <div className="space-y-2">
        {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
          <div key={category} className="flex flex-wrap gap-2">
            {categoryQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => onSelect(question.text)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={categoryLabels[category]}
              >
                <span className="text-gray-400">
                  {categoryIcons[category]}
                </span>
                <span>{question.text}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
