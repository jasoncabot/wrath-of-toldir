import { EntityTexture } from '@/models/commands';
import { v4 as uuidv4 } from 'uuid';

export type CharacterAction = 'list' | 'create' | 'show' | 'setRegion';

export interface CreateRequest {
    name: string
    texture: EntityTexture
}

export interface PlayableCharacter {
    id: string
    name: string
    texture: EntityTexture
    region: string
}

/**
 * The maximmum numbers of characters that a user can have
 */
const MAX_CHAR_COUNT = 5;

export class Character implements DurableObject {

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {

        const searchParams = new URLSearchParams(new URL(request.url).search);
        const action = searchParams.get('action') as CharacterAction;

        switch (action) {
            case "list": {
                const all = await this.state.storage.list<PlayableCharacter>({ limit: MAX_CHAR_COUNT });

                const characters = [];
                for (let character of all.values()) {
                    characters.push(character);
                }

                return new Response(JSON.stringify(characters), { status: 200 });
            }
            case "create": {
                const char = await request.json() as CreateRequest;
                const isValid = await this.isValid(char);
                if (isValid) {

                    // save to storage
                    const id = uuidv4();
                    const playableCharacter = {
                        id,
                        name: char.name,
                        texture: char.texture,
                        region: this.startingRegion(char)
                    } as PlayableCharacter;

                    this.state.storage.put(id, playableCharacter);

                    return new Response(JSON.stringify(playableCharacter), { status: 201 });
                } else {
                    return new Response(JSON.stringify({
                        "error": "Cannot create character"
                    }), { status: 400 });
                }
            }
            case "show": {
                const id = searchParams.get("characterId");

                if (id && id.length > 0) {
                    const character = await this.state.storage.get<PlayableCharacter>(id);
                    if (character) {
                        return new Response(JSON.stringify(character), { status: 200 });
                    } else {
                        return new Response(JSON.stringify({
                            "error": "Character not found"
                        }), { status: 404 });
                    }
                } else {
                    return new Response(JSON.stringify({
                        "error": "No identifier"
                    }), { status: 400 });
                }
            }
            case "setRegion": {
                const id = searchParams.get("characterId");

                if (id && id.length > 0) {
                    const character = await this.state.storage.get<PlayableCharacter>(id);
                    if (character) {
                        character.region = await request.text();
                        this.state.storage.put<PlayableCharacter>(id, character);
                        return new Response(JSON.stringify(character), { status: 200 });
                    } else {
                        return new Response(JSON.stringify({
                            "error": "Character not found"
                        }), { status: 404 });
                    }
                } else {
                    return new Response(JSON.stringify({
                        "error": "No identifier"
                    }), { status: 400 });
                }
            }
        }
    }

    private startingRegion(character: CreateRequest) {
        // TODO: Where should this character start?
        return "testroom1";
    }

    private async isValid(character: CreateRequest) {
        if (!character.name) return false;
        if (character.name.length < 2) return false;
        if (character.name.length > 30) return false;
        if ([EntityTexture.Hero1
            , EntityTexture.Hero2
            , EntityTexture.Hero3
            , EntityTexture.Hero4
            , EntityTexture.Hero5
            , EntityTexture.Hero6
            , EntityTexture.Hero7
            , EntityTexture.Hero8
            , EntityTexture.Hero9
            , EntityTexture.Hero10
        ].indexOf(character.texture) < 0) return false;
        const all = await this.state.storage.list<PlayableCharacter>({ limit: MAX_CHAR_COUNT });
        if (Object.keys(all).length === MAX_CHAR_COUNT) return false;
        return true;
    }
}
