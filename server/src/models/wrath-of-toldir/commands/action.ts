// automatically generated by the FlatBuffers compiler, do not modify

import { AttackCommand } from '../../wrath-of-toldir/commands/attack-command';
import { ChatCommand } from '../../wrath-of-toldir/commands/chat-command';
import { JoinCommand } from '../../wrath-of-toldir/commands/join-command';
import { LeaveCommand } from '../../wrath-of-toldir/commands/leave-command';
import { MoveCommand } from '../../wrath-of-toldir/commands/move-command';


export enum Action{
  NONE = 0,
  MoveCommand = 1,
  JoinCommand = 2,
  LeaveCommand = 3,
  AttackCommand = 4,
  ChatCommand = 5
}

export function unionToAction(
  type: Action,
  accessor: (obj:AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand) => AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand|null
): AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand|null {
  switch(Action[type]) {
    case 'NONE': return null; 
    case 'MoveCommand': return accessor(new MoveCommand())! as MoveCommand;
    case 'JoinCommand': return accessor(new JoinCommand())! as JoinCommand;
    case 'LeaveCommand': return accessor(new LeaveCommand())! as LeaveCommand;
    case 'AttackCommand': return accessor(new AttackCommand())! as AttackCommand;
    case 'ChatCommand': return accessor(new ChatCommand())! as ChatCommand;
    default: return null;
  }
}

export function unionListToAction(
  type: Action, 
  accessor: (index: number, obj:AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand) => AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand|null, 
  index: number
): AttackCommand|ChatCommand|JoinCommand|LeaveCommand|MoveCommand|null {
  switch(Action[type]) {
    case 'NONE': return null; 
    case 'MoveCommand': return accessor(index, new MoveCommand())! as MoveCommand;
    case 'JoinCommand': return accessor(index, new JoinCommand())! as JoinCommand;
    case 'LeaveCommand': return accessor(index, new LeaveCommand())! as LeaveCommand;
    case 'AttackCommand': return accessor(index, new AttackCommand())! as AttackCommand;
    case 'ChatCommand': return accessor(index, new ChatCommand())! as ChatCommand;
    default: return null;
  }
}

