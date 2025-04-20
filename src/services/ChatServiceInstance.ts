// ChatServiceInstance.ts
import { ChatLocalStorage } from './ChatLocalStorage';
import { ChatService } from './ChatService';
import { nanoid } from 'nanoid';

const messageIdGenerator = () => nanoid();
const groupIdGenerator = () => nanoid();

const storage = new ChatLocalStorage({ groupIdGenerator, messageIdGenerator });

export const chatService = new ChatService(storage, () => {});
export const chatStorage = storage;
