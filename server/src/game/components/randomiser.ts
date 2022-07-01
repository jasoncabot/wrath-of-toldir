import { create, RandomSeed } from 'random-seed';

class Randomiser {
    generator: RandomSeed;

    constructor(seed: string | undefined = undefined) {
        this.generator = create(seed);
    }

    /**
     * Picks a random element from the array
     * @param array The array to choose a random element from
     * @returns A randomly picked element from the array
     */
    pick: <T> (array: ArrayLike<T>) => T = (array) => {
        const index = this.generator.intBetween(0, array.length - 1);
        return array[index];
    }

    /**
     * Generates a random integer between start and end, inclusive of both start and end.
     * between(0, 100) # => 0 | 50 | 100
     * @param start inclusive 
     * @param end inclusive
     * @returns 
     */
    between: (start: number, end: number) => number = (start, end) => {
        return this.generator.intBetween(start, end);
    }

    /**
     * Generate a random boolean with a certain chance of being true
     * @param percentage The percentage chance of this returning true
     * @returns 
     */
    chance: (number: number) => boolean = (percentage: number) => {
        return Math.floor(this.generator.random() * 100) < percentage;
    }
}

export default Randomiser;
