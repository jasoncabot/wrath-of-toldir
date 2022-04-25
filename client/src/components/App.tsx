import React, { useEffect, useState } from 'react';
import { authToken, setCurrentCharacter } from '../scripts/services/auth';
import GameContainer from './GameContainer';
import { hero1, hero2, hero3, hero4, hero5, hero6, hero7, hero8, hero9, hero10 } from './../assets/spritesheets/Sprites/Heroes/';

export interface PlayableCharacter {
  id: string
  name: string
  texture: string
  region: string
}

const textures = ['hero1', 'hero2', 'hero3', 'hero4', 'hero5', 'hero6', 'hero7', 'hero8', 'hero9', 'hero10'];
const textureImages = [hero1, hero2, hero3, hero4, hero5, hero6, hero7, hero8, hero9, hero10];

const CharacterCreate = (props: { onNewCharacter: (name: string, texture: string) => void }) => {

  const [textureIndex, setTextureIndex] = useState(0);

  const onCreateSelected = () => {
    const name = (document.getElementById('characterName') as HTMLInputElement).value;
    props.onNewCharacter(name, textures[textureIndex]);
  }

  return (
    <div className="flex flex-nowrap">
      <div className="inline-block px-3">
        <div className="w-64 h-64 max-w-xs overflow-hidden rounded-lg shadow-md bg-white hover:shadow-xl transition-shadow duration-300 ease-in-out">
          <form className="flex flex-col w-full h-full max-w-xs p-4" autoComplete='off'>
            <div className='flex flex-1 items-center'>
              <a className='flex flex-1 items-center cursor-pointer h-full justify-start select-none' onClick={() => setTextureIndex(Math.max(0, textureIndex - 1))}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                </svg>
              </a>
              <img className='object-none object-left-top h-12' src={textureImages[textureIndex]} alt={`Hero ${textureIndex}`} width={48} height={48} />
              <a className='flex flex-1 items-center cursor-pointer h-full justify-end select-none' onClick={() => setTextureIndex(Math.min(textures.length - 1, textureIndex + 1))}>
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

const CharacterList = (props: { characters: PlayableCharacter[], onSelected: (character: PlayableCharacter) => void }) => {
  const chars: PlayableCharacter[] = props.characters;

  const onNewCharacter = async (name: string, texture: string) => {
    const character = await createCharacter({ name, texture });
    props.onSelected(character);
  }

  return (
    <div className='flex-col'>
      <h1 className='text-gray-900 text-xl'>Wrath of Toldir</h1>

      <div className="m-auto p-auto">
        <div className="flex overflow-x-scroll pb-10 hide-scroll-bar">
          {chars.map(character =>
            <div key={character.id} className="flex flex-nowrap cursor-pointer select-none" onClick={() => props.onSelected(character)}>
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
          )}
          <CharacterCreate onNewCharacter={onNewCharacter} />
        </div>
      </div>
    </div>
  );
}

const fetchCharacters = () => {
  const apiURI = `${process.env.API_URI}/api/characters`;
  return fetch(apiURI, { headers: { 'Authorization': `Bearer ${authToken()}` } })
    .then(resp => resp.json());
}

const createCharacter = (character: { name: string, texture: string }) => {
  const apiURI = `${process.env.API_URI}/api/characters`;
  return fetch(apiURI, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken()}` },
    body: JSON.stringify(character)
  }
  ).then(resp => resp.json());
}

const App = () => {
  const [data, setData] = useState({ state: 'initial', characters: [] });
  const [selected, setSelected] = useState<PlayableCharacter | undefined>(undefined);

  const onPlayNow = () => {
    setData({ characters: data.characters, state: 'loading' });
    fetchCharacters().then((list) => {
      setData({ characters: list, state: 'loaded' });
    });
  }

  const onCharacterSelected = (character: PlayableCharacter) => {
    setCurrentCharacter(character);
    setSelected(character);
  }

  // If we have already chosen a character
  if (selected) {
    return (
      <GameContainer character={selected} />
    )
  }

  // Otherwise load our selection
  switch (data.state) {
    case 'initial': {
      return (
        <section className="dark:text-gray-600 body-font">
          <h1 className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-900">Wrath of Toldir</h1>
          <p className="mb-8 leading-relaxed">
            I'm building an MMORPG. It's <a href="https://github.com/jasoncabot/wrath-of-toldir">open source</a>, under heavy development and likely to be a <a href="https://www.gamedev.net/blog/355/entry-2250155-why-you-shouldnt-be-making-an-mmo/">terrible idea</a>.
            <br />
            However you're more than welcome to poke around
          </p>
          <div className="flex justify-center">
            <button onClick={() => onPlayNow()} className="inline-flex text-white bg-indigo-500 border-0 py-2 px-6 focus:outline-none hover:bg-indigo-600 rounded text-lg">Play now</button>
          </div>
        </section>
      )
    }
    case 'loading': {
      return <div>Loading</div>
    }
    case 'loaded': {
      return (
        <div className='app'>
          <CharacterList characters={data.characters} onSelected={onCharacterSelected} />
        </div>
      );
    }
    default: return <div />
  }
}

export default App;
