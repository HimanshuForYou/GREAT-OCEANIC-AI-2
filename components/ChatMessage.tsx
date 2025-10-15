import React from 'react';
import { Message, Role } from '../types';
import { WaveIcon, UserIcon, ImageIcon } from './Icons';

interface ChatMessageProps {
  message: Message;
  onGenerateImage?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onGenerateImage }) => {
  const isUser = message.role === Role.USER;

  const wrapperClasses = isUser ? 'flex justify-end' : 'flex justify-start';
  const messageClasses = isUser
    ? 'bg-blue-600/80 rounded-t-2xl rounded-bl-2xl'
    : 'bg-gray-700/80 rounded-t-2xl rounded-br-2xl';
  
  const formattedContent = message.content.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      <br/>
    </span>
  ));

  return (
    <div className={wrapperClasses}>
      <div className={`flex items-start space-x-3 max-w-lg ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-500' : 'bg-cyan-500'}`}>
          {isUser ? <UserIcon className="w-6 h-6 text-white"/> : <WaveIcon className="w-6 h-6 text-white"/>}
        </div>
        <div className={`p-4 text-white ${messageClasses} w-full`}>
          <p className="text-base leading-relaxed">{formattedContent}</p>
          {message.isGeneratingImage && (
            <div className="mt-4 flex items-center justify-center p-4 bg-gray-900/50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="ml-3 text-cyan-300">Generating visualization...</p>
            </div>
          )}
          {message.imageUrl && (
            <div className="mt-4 rounded-lg overflow-hidden border-2 border-cyan-500/50">
                <img src={message.imageUrl} alt="Generated visualization" className="w-full h-auto" />
            </div>
          )}
          {onGenerateImage && (
             <button
                onClick={onGenerateImage}
                className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 transition-colors"
             >
                <ImageIcon className="w-5 h-5 mr-2" />
                Generate Visualization
             </button>
          )}
        </div>
      </div>
    </div>
  );
};