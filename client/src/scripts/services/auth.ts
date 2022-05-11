import { v4 as uuidv4 } from 'uuid';
import { PlayableCharacter } from '../../components/CharacterList';

const storage = window.localStorage;

export const authToken = () => {
    let token = storage.getItem('token');
    if (!token) {
        token = uuidv4();
        storage.setItem('token', token);
    }
    return token;
}

export const setCurrentCharacter = (character: PlayableCharacter) => {
    storage.setItem('current-char', JSON.stringify(character));
}

const currentCharacter = () => {
    return JSON.parse(storage.getItem('current-char') || "{}") as PlayableCharacter;
}

export const currentCharacterRegion = () => {
    return currentCharacter().region;
}

export const currentCharacterToken = () => {
    return currentCharacter().id;
}
