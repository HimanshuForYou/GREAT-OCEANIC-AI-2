import React, { useState, useEffect } from 'react';
import { SendIcon, MicrophoneIcon } from './Icons';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const {
    isListening,
    error,
    startListening,
    stopListening,
    isSpeechRecognitionSupported
  } = useVoiceRecognition((transcript) => {
    setInputValue(transcript);
  });

  useEffect(() => {
    if (error) {
        // You could show an alert or a toast here
        console.error("Voice Recognition Error:", error);
    }
  }, [error]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleMicClick = () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
  };
  
  const micButtonClasses = () => {
    if (isListening) return 'bg-red-500 hover:bg-red-600 animate-pulse';
    if (error) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-gray-700 hover:bg-gray-600';
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={isListening ? "Listening..." : "Ask about the ocean..."}
        disabled={isLoading || isListening}
        className="flex-1 bg-gray-900 border border-gray-600 rounded-full px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-300 disabled:opacity-50"
      />
      
      {isSpeechRecognitionSupported && (
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading}
          className={`text-white rounded-full p-3 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed ${micButtonClasses()}`}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          <MicrophoneIcon className="w-6 h-6" />
        </button>
      )}

      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <SendIcon className="w-6 h-6" />
      </button>
    </form>
  );
};