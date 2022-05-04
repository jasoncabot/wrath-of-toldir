import React from 'react';
import { textureImages } from '../assets/spritesheets/Sprites/Heroes';
import { createCharacter } from '../scripts/services/characters';
import { CharacterCreate } from './CharacterCreate';

export interface PlayableCharacter {
    id: string
    name: string
    texture: string
    region: string
}

type OnCharacterSelected = (character: PlayableCharacter) => void

const CharacterListItem = (props: { character: PlayableCharacter, onSelected: OnCharacterSelected }) => {
    const { character, onSelected } = props;
    return (
        <div className="flex flex-nowrap cursor-pointer select-none" onClick={() => onSelected(character)}>
            <div className="inline-block px-3">
                <div className="w-64 h-64 max-w-xs overflow-hidden rounded-lg shadow-md bg-white hover:shadow-xl transition-shadow duration-300 ease-in-out">
                    <div className="flex flex-col w-full h-full max-w-xs p-4">
                        <div className='flex flex-1 items-center'>
                            <img className='mx-auto my-0 object-none object-left-top h-12' src={textureImages[character.texture]} alt={`Character ${character.name}`} width={48} height={48} />
                        </div>
                        <h1 className="text-gray-900 text-xl leading-tight font-medium mb-2">{character.name}</h1>
                        <h2 className="text-gray-500 text-base leading-tight font-medium mb-2">Last seen in {character.region}</h2>
                    </div>
                </div>
            </div>
        </div >
    );
}

export const CharacterList = (props: { characters: PlayableCharacter[], onSelected: OnCharacterSelected }) => {
    const { characters, onSelected } = props;
    const onNewCharacter = async (name: string, texture: string) => {
        const character = await createCharacter({ name, texture });
        onSelected(character);
    }

    return (
        <div className='flex-col m-auto p-auto'>
            <div className="flex overflow-x-scroll pb-10 hide-scroll-bar">
                {characters.map(character => <CharacterListItem key={character.id} character={character} onSelected={onSelected} />)}
                <CharacterCreate onNewCharacter={onNewCharacter} />
            </div>
        </div>
    );
}
