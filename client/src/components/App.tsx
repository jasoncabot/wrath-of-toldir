import React, { useState } from 'react';
import { setCurrentCharacter } from '../scripts/services/auth';
import { fetchCharacters } from '../scripts/services/characters';
import { CharacterList, PlayableCharacter } from './CharacterList';
import GameContainer from './GameContainer';

type AppState = 'initial' | 'loading' | 'loaded';

const App = () => {
  const [data, setData] = useState<{ state: AppState, characters: any[] }>({ state: 'initial', characters: [] });
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

  const componentForState = () => {
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
          <section className="bg-white m-8 rounded-lg px-6 py-8 ring-1 ring-slate-900/5 shadow-xl">
            <h1 className='font-medium leading-tight text-5xl mt-0 mb-2'>Wrath of Toldir</h1>
            <p className="mb-8 leading-relaxed">
              An <a className='underline' href="https://github.com/jasoncabot/wrath-of-toldir">open source</a>, cross-platform and mobile-friendly basic MMORPG under heavy development.
            </p>
            <div className="flex justify-center">
              <button onClick={() => onPlayNow()} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Play now</button>
            </div>
          </section>
        )
      }
      case 'loading': {
        return <div>Loading</div>
      }
      case 'loaded': {
        return (
          <CharacterList characters={data.characters} onSelected={onCharacterSelected} />
        );
      }
      default: ((_: never) => { throw new Error("Should handle every state") })(data.state);
    }
  }

  // Render this component
  const inner = componentForState();
  return (
    <div className='app'>
      {inner}
    </div>
  )

}

export default App;
