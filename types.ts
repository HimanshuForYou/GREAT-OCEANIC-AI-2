export enum Role {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  role: Role;
  content: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageGenPrompt?: string;
}