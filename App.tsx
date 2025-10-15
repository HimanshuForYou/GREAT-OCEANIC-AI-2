import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { WaveIcon, ChartIcon } from './components/Icons';
import { getOceanicData } from './services/oceanicDataService';
import { ai, MODEL_NAME, SYSTEM_INSTRUCTION, generateImage } from './services/geminiService';
import { Message, Role } from './types';
import { DataChart } from './components/DataChart';

type View = 'chat' | 'chart';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [oceanicData, setOceanicData] = useState<any[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('chat');
  const [selectedDate, setSelectedDate] = useState('2023-07-01');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      setDataError(null);
      setOceanicData(null);
      chatRef.current = null; // Reset chat session on new data

      setMessages([
        {
          role: Role.AI,
          content: `Loading oceanic data for ${selectedDate}...`,
        },
      ]);

      try {
        const data = await getOceanicData(selectedDate);
        setOceanicData(data);
        setMessages([
          { role: Role.AI, content: `Data for ${selectedDate} is loaded. Ask me anything about it or view the data chart!` }
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setDataError(errorMessage);
        setMessages([
          { role: Role.AI, content: `I'm sorry, I couldn't load the oceanic data for ${selectedDate}. ${errorMessage}` }
        ]);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (activeView === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeView]);
  
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: Message = { role: Role.USER, content: userInput };
    setMessages(prevMessages => [...prevMessages, newUserMessage, { role: Role.AI, content: '' }]);
    setIsLoading(true);
    let accumulatedResponse = '';

    try {
      let responseStream;

      if (!chatRef.current) {
        if (!oceanicData) {
          throw new Error("Oceanic data is not available yet. Please wait for it to load.");
        }
        const stringifiedData = JSON.stringify(oceanicData, null, 2);

        chatRef.current = ai.chats.create({
          model: MODEL_NAME,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.5,
          },
        });

        const prompt = `
          Here is the oceanic data for our conversation:
          \`\`\`json
          ${stringifiedData}
          \`\`\`

          Now, please answer my first question: "${userInput}"
        `;
        responseStream = await chatRef.current.sendMessageStream({ message: prompt });
      } else {
        responseStream = await chatRef.current.sendMessageStream({ message: userInput });
      }

      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        accumulatedResponse += chunkText;
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessageIndex = newMessages.length - 1;
          const lastMessage = newMessages[lastMessageIndex];
          
          if (lastMessage.role === Role.AI) {
            newMessages[lastMessageIndex] = {
              ...lastMessage,
              content: lastMessage.content + chunkText,
            };
          }
          
          return newMessages;
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastMessageIndex = newMessages.length - 1;
        const lastMessage = newMessages[lastMessageIndex];
        
        if (lastMessage.role === Role.AI) {
            newMessages[lastMessageIndex] = {
                ...lastMessage,
                content: `Sorry, something went wrong. ${errorMessage}`,
            };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      const imagePromptPrefix = 'IMAGE_PROMPT:';
      if (accumulatedResponse.includes(imagePromptPrefix)) {
          const promptStartIndex = accumulatedResponse.indexOf(imagePromptPrefix) + imagePromptPrefix.length;
          const imagePrompt = accumulatedResponse.substring(promptStartIndex).trim();
          const cleanedContent = accumulatedResponse.substring(0, accumulatedResponse.indexOf(imagePromptPrefix)).trim();

          setMessages(prevMessages => {
              const newMessages = [...prevMessages];
              const lastMessageIndex = newMessages.length - 1;
              if (newMessages[lastMessageIndex].role === Role.AI) {
                  newMessages[lastMessageIndex] = {
                      ...newMessages[lastMessageIndex],
                      content: cleanedContent,
                      imageGenPrompt: imagePrompt,
                  };
              }
              return newMessages;
          });
      }
    }
  };

  const handleGenerateImage = async (messageIndex: number, prompt: string) => {
    setMessages(prev => prev.map((msg, index) => 
        index === messageIndex ? { ...msg, isGeneratingImage: true } : msg
    ));

    try {
        const imageUrl = await generateImage(prompt);
        setMessages(prev => prev.map((msg, index) => 
            index === messageIndex ? { ...msg, isGeneratingImage: false, imageUrl } : msg
        ));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setMessages(prev => prev.map((msg, index) => 
            index === messageIndex ? { ...msg, isGeneratingImage: false, content: `${msg.content}\n\n**Image Generation Failed:** ${errorMessage}` } : msg
        ));
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white font-sans">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10">
          <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-wrap gap-4">
            <div className="flex items-center">
              <WaveIcon className="w-8 h-8 text-cyan-400" />
              <h1 className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Oceanic AI
              </h1>
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        disabled={isDataLoading}
                        className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-300 disabled:opacity-50"
                        aria-label="Select data date"
                    />
                </div>
                <button
                    onClick={() => setActiveView('chat')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${
                        activeView === 'chat'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                    aria-pressed={activeView === 'chat'}
                >
                    Chat
                </button>
                <button
                    onClick={() => setActiveView('chart')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        activeView === 'chart'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                    disabled={!oceanicData || isDataLoading}
                    aria-label="View Data Chart"
                    aria-pressed={activeView === 'chart'}
                >
                    <ChartIcon className="w-5 h-5 mr-2" />
                    Data Chart
                </button>
            </div>
          </header>
          
          <main className="flex-1 min-h-0">
             {activeView === 'chat' ? (
                <div className="h-full overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, index) => (
                      <ChatMessage
                        key={index}
                        message={msg}
                        onGenerateImage={
                          msg.imageGenPrompt && !msg.imageUrl && !msg.isGeneratingImage
                            ? () => handleGenerateImage(index, msg.imageGenPrompt!)
                            : undefined
                        }
                      />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                ) : (
                <div className="h-full p-4">
                    <DataChart data={oceanicData || []} />
                </div>
             )}
          </main>
          
          {activeView === 'chat' && (
            <footer className="p-4 border-t border-gray-700">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || isDataLoading || !oceanicData} />
            </footer>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;