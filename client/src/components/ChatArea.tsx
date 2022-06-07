import React, { useCallback, useEffect, useRef } from 'react';

export interface ChatMessage {
    name: string
    message: string
}

export const ChatArea = () => {
    const chatMessage = useRef<HTMLInputElement>(null);
    const chatMessages = useRef<HTMLOListElement>(null);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape") {
            document.dispatchEvent(new CustomEvent('blur-chat-dialog'));
        }
    }, []);

    const onSend = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent<{ message: string }>('submit-chat-dialog', {
            detail: { message: chatMessage.current!.value }
        }));
        onBlurChat();
        return false;
    }, [])

    const onFocusChat = () => {
        chatMessage.current!.focus();
        document.dispatchEvent(new CustomEvent('chat-dialog-focused'));
    }

    const onBlurChat = () => {
        chatMessage.current!.value = "";
        chatMessage.current!.blur();
        document.dispatchEvent(new CustomEvent('chat-dialog-blurred'));
    }

    const onChatEvent = (e) => {
        const event = e as CustomEvent<ChatMessage>;
        const listItem = document.createElement('li');
        listItem.innerText = `${event.detail.name}: ${event.detail.message}`;
        chatMessages.current!.appendChild(listItem);
        listItem.scrollIntoView(true);
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown, false);
        document.addEventListener('focus-chat-dialog', onFocusChat, false);
        document.addEventListener('blur-chat-dialog', onBlurChat, false);
        document.addEventListener('chat-event', onChatEvent, false);

        return () => {
            document.removeEventListener("keydown", onKeyDown, false);
            document.removeEventListener('focus-chat-dialog', onFocusChat, false);
            document.removeEventListener('blur-chat-dialog', onBlurChat, false);
            document.removeEventListener('chat-event', onChatEvent, false);
        };
    }, []);

    return (
        <div className="flex flex-1 flex-col p-3" style={{ minHeight: '255px',maxWidth: '576px' }}>
            <ol className='bg-slate-200 rounded-xl font-light flex-1 basis-0 text-xs overflow-y-scroll p-1' ref={chatMessages}>
            </ol>
            <form className='flex items-center justify-between w-full' autoComplete='off' onSubmit={onSend}>
                <input type="text"
                    ref={chatMessage}
                    maxLength={120}
                    className="bg-slate-200	block w-full py-2 pl-4 mr-3 mt-3 rounded-xl outline-none md:text-xs text-l"
                    onFocus={() => document.dispatchEvent(new CustomEvent('chat-dialog-focused'))}
                    onBlur={() => document.dispatchEvent(new CustomEvent('chat-dialog-blurred'))}
                    name="message" />
                <button type="submit">
                    <svg className="mt-3 mr-3 w-5 h-5 origin-center transform rotate-90 text-blue-500 hover:blue-700"
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </form>
        </div>
    )
}
