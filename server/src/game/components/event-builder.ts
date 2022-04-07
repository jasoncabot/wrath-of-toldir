import { Builder } from "flatbuffers";
import { PlayerId } from "../game";

type Effects = { builder: Builder, eventOffsets: number[], eventTypeOffsets: number[] };

export class EventBuilder {
    private tickEvents: Record<PlayerId, Effects>;

    constructor() {
        this.tickEvents = {};
    }

    // TODO: shift all FlatBuffer (event) construction to this class

    tickEventsForPlayer(playerId: PlayerId) {
        let data = this.tickEvents[playerId];
        if (!data) {
            data = {
                builder: new Builder(1024),
                eventOffsets: [],
                eventTypeOffsets: []
            };
            this.tickEvents[playerId] = data;
        }
        return data;
    }

    popEventsForPlayer(playerId: PlayerId) {
        const events = this.tickEvents[playerId];
        delete this.tickEvents[playerId];
        return events;
    }

}