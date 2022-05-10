import React, { useState } from 'react';
import { imageForEntity } from '../assets/spritesheets/Sprites';
import { EntityTexture } from '../models/commands';

const available = [
    EntityTexture.Hero1,
    EntityTexture.Hero2,
    EntityTexture.Hero3,
    EntityTexture.Hero4,
    EntityTexture.Hero5,
    EntityTexture.Hero6,
    EntityTexture.Hero7,
    EntityTexture.Hero8,
    EntityTexture.Hero9,
    EntityTexture.Hero10,
];

export const CharacterCreate = (props: { onNewCharacter: (name: string, texture: EntityTexture) => void }) => {

    const [textureIndex, setTextureIndex] = useState(0);

    const onCreateSelected = () => {
        const name = (document.getElementById('characterName') as HTMLInputElement).value;
        props.onNewCharacter(name, available[textureIndex]);
    }

    return (
        <div className="flex flex-nowrap">
            <div className="inline-block px-3">
                <div className="w-64 h-64 max-w-xs overflow-hidden rounded-lg shadow-md bg-white hover:shadow-xl transition-shadow duration-300 ease-in-out">
                    <form className="flex flex-col w-full h-full max-w-xs p-4" autoComplete='off' onSubmit={(e: any) => {
                        e.preventDefault();
                        onCreateSelected();
                        return false;
                    }}>
                        <div className='flex flex-1 items-center'>
                            <a className='flex flex-1 items-center cursor-pointer h-full justify-start select-none' onClick={() => setTextureIndex(Math.max(0, textureIndex - 1))}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                                </svg>
                            </a>
                            <img className='object-none object-left-top h-12' src={imageForEntity(available[textureIndex])} alt={`Hero ${textureIndex}`} width={48} height={48} />
                            <a className='flex flex-1 items-center cursor-pointer h-full justify-end select-none' onClick={() => setTextureIndex(Math.min(available.length - 1, textureIndex + 1))}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                                </svg>
                            </a>
                        </div>
                        <div className="mb-4">
                            <input id='characterName' className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline" type="text" placeholder="Name" required={true} />
                        </div>
                        <button onClick={onCreateSelected} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
                            Create
                        </button>
                    </form>
                </div>
            </div>
        </div >
    )
}
