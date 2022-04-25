import React, { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

import { GridEngine } from 'grid-engine';
import { MainScene, PreloadScene } from '../scripts/scenes';
import { PlayableCharacter } from './App';

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#2e222f',
    parent: 'game-content',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 576,
        height: 576
    },
    scene: [PreloadScene, MainScene],
    plugins: {
        scene: [
            {
                key: "gridEngine",
                plugin: GridEngine,
                mapping: "gridEngine",
            },
        ],
    },
    dom: {
        createContainer: false
    },
    render: {
        pixelArt: true
    }
};

const GameContainer = (props: { character: PlayableCharacter }) => {
    useEffect(() => {
        // TODO: In StrictMode this gets called twice - have a better method for initialising phaser here
        if (window.game) return;
        window.game = new Phaser.Game(config);
    });

    return (
        <div>
            <div id='game-content' />
            <ChatArea />
        </div>
    );
}


const ChatArea = () => {
    const chatMessage = useRef<HTMLInputElement>(null);
    const [visible, setVisible] = useState(false);

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape") {
            document.dispatchEvent(new CustomEvent('hide-chat-dialog'));
        }
    }, []);

    const onSend = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent<{ message: string }>('submit-chat-dialog', {
            detail: { message: chatMessage.current!.value }
        }));
        chatMessage.current!.value = "";
        document.dispatchEvent(new CustomEvent('hide-chat-dialog'));
        return false;
    }, [])

    useEffect(() => {
        const onShowChatDialog = () => setVisible(true);
        const onHideChatDialog = () => setVisible(false);

        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('hide-chat-dialog', onHideChatDialog, false);
        document.addEventListener('show-chat-dialog', onShowChatDialog, false);

        if (visible) {
            chatMessage.current?.focus();
        }

        return () => {
            document.removeEventListener("keydown", onKeyDown, false);
            document.removeEventListener('hide-chat-dialog', onHideChatDialog, false);
            document.removeEventListener('show-chat-dialog', onShowChatDialog, false);
        };
    }, [visible]);

    return (
        <div id='chatbox' className={`w-full ${visible ? '' : 'hidden'}`}>
            <form id="chatform" className='flex items-center justify-between w-full p-3' autoComplete='off' onSubmit={onSend}>
                <input type="text"
                    ref={chatMessage}
                    maxLength={120}
                    className="bg-slate-200	block w-full py-2 pl-4 mx-3 rounded-full outline-none"
                    name="message" />
                <button type="submit">
                    <svg className="w-5 h-5 origin-center transform rotate-90"
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </form>
        </div>
    )
}

export default GameContainer;
