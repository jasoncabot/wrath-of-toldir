import React, { useState } from 'react';
import { setCurrentCharacter } from '../scripts/services/auth';
import { fetchCharacters } from '../scripts/services/characters';
import { CharacterList, PlayableCharacter } from './CharacterList';
import GameContainer from './GameContainer';

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
          <section className="body-font">
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
          <CharacterList characters={data.characters} onSelected={onCharacterSelected} />
        );
      }
      default: return <div />
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
