import { HeroTexture } from "@/models/events";

export const asHeroTexture = (texture: string) => {
    switch (texture) {
        case 'hero1': return HeroTexture.Hero1;
        case 'hero2': return HeroTexture.Hero2;
        case 'hero3': return HeroTexture.Hero3;
        case 'hero4': return HeroTexture.Hero4;
        case 'hero5': return HeroTexture.Hero5;
        case 'hero6': return HeroTexture.Hero6;
        case 'hero7': return HeroTexture.Hero7;
        case 'hero8': return HeroTexture.Hero8;
        case 'hero9': return HeroTexture.Hero9;
        case 'hero10': return HeroTexture.Hero10;
    }
    return undefined;
}
