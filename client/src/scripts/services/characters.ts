import { EntityTexture } from "../../models/commands";
import { authToken } from "./auth";

export const fetchCharacters = () => {
    const apiURI = `${process.env.API_URI}/api/characters`;
    return fetch(apiURI, { headers: { 'Authorization': `Bearer ${authToken()}` } })
        .then(resp => resp.json());
}

export const createCharacter = (character: { name: string, texture: EntityTexture }) => {
    const apiURI = `${process.env.API_URI}/api/characters`;
    return fetch(apiURI, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken()}` },
        body: JSON.stringify(character)
    }
    ).then(resp => resp.json());
}
