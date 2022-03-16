// automatically generated by the FlatBuffers compiler, do not modify

import { AttackEvent } from '../../wrath-of-toldir/events/attack-event';
import { JoinEvent } from '../../wrath-of-toldir/events/join-event';
import { LeaveEvent } from '../../wrath-of-toldir/events/leave-event';
import { MoveEvent } from '../../wrath-of-toldir/events/move-event';


export enum Update{
  NONE = 0,
  JoinEvent = 1,
  MoveEvent = 2,
  LeaveEvent = 3,
  AttackEvent = 4
}

export function unionToUpdate(
  type: Update,
  accessor: (obj:AttackEvent|JoinEvent|LeaveEvent|MoveEvent) => AttackEvent|JoinEvent|LeaveEvent|MoveEvent|null
): AttackEvent|JoinEvent|LeaveEvent|MoveEvent|null {
  switch(Update[type]) {
    case 'NONE': return null; 
    case 'JoinEvent': return accessor(new JoinEvent())! as JoinEvent;
    case 'MoveEvent': return accessor(new MoveEvent())! as MoveEvent;
    case 'LeaveEvent': return accessor(new LeaveEvent())! as LeaveEvent;
    case 'AttackEvent': return accessor(new AttackEvent())! as AttackEvent;
    default: return null;
  }
}

export function unionListToUpdate(
  type: Update, 
  accessor: (index: number, obj:AttackEvent|JoinEvent|LeaveEvent|MoveEvent) => AttackEvent|JoinEvent|LeaveEvent|MoveEvent|null, 
  index: number
): AttackEvent|JoinEvent|LeaveEvent|MoveEvent|null {
  switch(Update[type]) {
    case 'NONE': return null; 
    case 'JoinEvent': return accessor(index, new JoinEvent())! as JoinEvent;
    case 'MoveEvent': return accessor(index, new MoveEvent())! as MoveEvent;
    case 'LeaveEvent': return accessor(index, new LeaveEvent())! as LeaveEvent;
    case 'AttackEvent': return accessor(index, new AttackEvent())! as AttackEvent;
    default: return null;
  }
}

