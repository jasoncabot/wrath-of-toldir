import { GridEngine } from 'grid-engine';
import Phaser from 'phaser';
import React, { useEffect } from 'react';
import { MainScene, PreloadScene } from '../scripts/scenes';
import { PlayableCharacter } from './CharacterList';
import { ChatArea } from './ChatArea';

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#2e222f',
    parent: 'game-content',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
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
        <div className='flex flex-col md:flex-row'>
            <div id='game-content' />
            <ChatArea />
        </div>
    );
}

export default GameContainer;
