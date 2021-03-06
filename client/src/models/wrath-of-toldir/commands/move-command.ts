// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Vec2 } from '../../wrath-of-toldir/vec2';


export class MoveCommand {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):MoveCommand {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMoveCommand(bb:flatbuffers.ByteBuffer, obj?:MoveCommand):MoveCommand {
  return (obj || new MoveCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMoveCommand(bb:flatbuffers.ByteBuffer, obj?:MoveCommand):MoveCommand {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MoveCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

pos(obj?:Vec2):Vec2|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Vec2()).__init(this.bb_pos + offset, this.bb!) : null;
}

static startMoveCommand(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addPos(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset) {
  builder.addFieldStruct(0, posOffset, 0);
}

static endMoveCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMoveCommand(builder:flatbuffers.Builder, posOffset:flatbuffers.Offset):flatbuffers.Offset {
  MoveCommand.startMoveCommand(builder);
  MoveCommand.addPos(builder, posOffset);
  return MoveCommand.endMoveCommand(builder);
}
}
