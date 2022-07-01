import { Character, Item as ItemBuffer } from "../../models/events";
import { LabelledBarDataSource } from './labelledBar';

export default class CharacterSheet implements LabelledBarDataSource {
    health: { current: number, max: number };
    magic: { current: number, max: number };
    experience: { current: number, max: number, level: number };

    constructor(character: Character) {
        this.health = {
            current: character.player()!.hp()!,
            max: character.player()!.maxHp()!
        };
        this.magic = {
            current: character.stats()!.mp()!,
            max: character.stats()!.maxMp()!
        };
        this.experience = {
            current: character.stats()!.exp()!,
            max: character.stats()!.maxExp()!,
            level: character.stats()!.level()!
        };
    }

    text() {
        return JSON.stringify([this.health, this.magic, this.experience]);
    }
}
