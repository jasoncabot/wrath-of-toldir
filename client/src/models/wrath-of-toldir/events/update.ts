// automatically generated by the FlatBuffers compiler, do not modify

import { AttackEvent } from '../../wrath-of-toldir/events/attack-event';
import { ChatEvent } from '../../wrath-of-toldir/events/chat-event';
import { DamagedEvent } from '../../wrath-of-toldir/events/damaged-event';
import { ItemDropEvent } from '../../wrath-of-toldir/events/item-drop-event';
import { JoinEvent } from '../../wrath-of-toldir/events/join-event';
import { LeaveEvent } from '../../wrath-of-toldir/events/leave-event';
import { MapChangedEvent } from '../../wrath-of-toldir/events/map-changed-event';
import { MapJoinedEvent } from '../../wrath-of-toldir/events/map-joined-event';
import { MoveEvent } from '../../wrath-of-toldir/events/move-event';


export enum Update{
  NONE = 0,
  JoinEvent = 1,
  MoveEvent = 2,
  LeaveEvent = 3,
  AttackEvent = 4,
  MapJoinedEvent = 5,
  MapChangedEvent = 6,
  DamagedEvent = 7,
  ChatEvent = 8,
  ItemDropEvent = 9
}

export function unionToUpdate(
  type: Update,
  accessor: (obj:AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent) => AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent|null
): AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent|null {
  switch(Update[type]) {
    case 'NONE': return null; 
    case 'JoinEvent': return accessor(new JoinEvent())! as JoinEvent;
    case 'MoveEvent': return accessor(new MoveEvent())! as MoveEvent;
    case 'LeaveEvent': return accessor(new LeaveEvent())! as LeaveEvent;
    case 'AttackEvent': return accessor(new AttackEvent())! as AttackEvent;
    case 'MapJoinedEvent': return accessor(new MapJoinedEvent())! as MapJoinedEvent;
    case 'MapChangedEvent': return accessor(new MapChangedEvent())! as MapChangedEvent;
    case 'DamagedEvent': return accessor(new DamagedEvent())! as DamagedEvent;
    case 'ChatEvent': return accessor(new ChatEvent())! as ChatEvent;
    case 'ItemDropEvent': return accessor(new ItemDropEvent())! as ItemDropEvent;
    default: return null;
  }
}

export function unionListToUpdate(
  type: Update, 
  accessor: (index: number, obj:AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent) => AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent|null, 
  index: number
): AttackEvent|ChatEvent|DamagedEvent|ItemDropEvent|JoinEvent|LeaveEvent|MapChangedEvent|MapJoinedEvent|MoveEvent|null {
  switch(Update[type]) {
    case 'NONE': return null; 
    case 'JoinEvent': return accessor(index, new JoinEvent())! as JoinEvent;
    case 'MoveEvent': return accessor(index, new MoveEvent())! as MoveEvent;
    case 'LeaveEvent': return accessor(index, new LeaveEvent())! as LeaveEvent;
    case 'AttackEvent': return accessor(index, new AttackEvent())! as AttackEvent;
    case 'MapJoinedEvent': return accessor(index, new MapJoinedEvent())! as MapJoinedEvent;
    case 'MapChangedEvent': return accessor(index, new MapChangedEvent())! as MapChangedEvent;
    case 'DamagedEvent': return accessor(index, new DamagedEvent())! as DamagedEvent;
    case 'ChatEvent': return accessor(index, new ChatEvent())! as ChatEvent;
    case 'ItemDropEvent': return accessor(index, new ItemDropEvent())! as ItemDropEvent;
    default: return null;
  }
}

