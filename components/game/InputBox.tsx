'use client';

import { useState, useRef, useEffect } from 'react';
import { getAutocomplete } from '@/lib/countries';

interface InputBoxProps {
  onSubmit: (value: string) => boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function InputBox({ onSubmit, placeholder = 'Type a country...', disabled = false }: InputBoxProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.trim()) {
      const suggestions = getAutocomplete(value);
      setSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onSubmit(input)) {
      setInput('');
      setSuggestions([]);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onSubmit(suggestion)) {
      setInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input-neon w-full"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={disabled}
          className="neon-btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 text-xs"
        >
          Submit
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#f8fafc] border border-[#1f6feb] border-opacity-50 rounded-lg overflow-hidden z-10">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-[#ffffff] text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
