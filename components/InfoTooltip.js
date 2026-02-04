// components/InfoTooltip.js
// Simple tooltip component for form field help text
import { useState } from 'react';

export default function InfoTooltip({ text }) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block ml-2">
            <button
                type="button"
                className="text-blue-400 hover:text-blue-300 transition"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
            >
                <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {show && (
                <div className="absolute z-10 w-64 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                    <div className="relative">
                        {text}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                            <div className="border-8 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}